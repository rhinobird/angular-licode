'use strict';

angular.module('pl-licode-services')
  .provider('CameraService', function(){

    var config = {
      videoConstrain: false,
      audioConstrain: false,
      dataConstrain: false
    }

    var setConstrain = function(target, key, value, level){

      if (level != 'optional' && level != 'mandatory' && level != 'licode') {
        throw "No video constrain level defined using [licode, mandatory, optional]";
      }

      var constrain;

      if(level == 'optional'){
        // Get the optional contrains
        constrain = config[target + "Constrain"].optional

        // Try to find an existing constrain key
        var constrainValue = _.find(constrain, function(c){
          return _.contains(_.keys(c), key);
        });

        // If the constrain exist update it, if not create it
        if(constrainValue){
          constrainValue[key] = value;
        }
        else{
          var newConstrain = {}
          newConstrain[key] = value;
          constrain.push(newConstrain);
        }
      }
      else if (level == 'licode') {
        constrain = config[target + "Constrain"]
        constrain[key] = value
      } else {
        // Get the mandatory contrains
        constrain = config[target + "Constrain"].mandatory
        // Set the constrain
        constrain[key] = value
      }
    };


    return {

      enableVideo: function(state){
        config.videoConstrain = true;
      },

      enableAudio: function(state){
        config.audioConstrain = true;
      },

      enableData: function(state){
        config.dataConstrain = true;
      },

      setVideoConstrain: function(key, value, level){
        var vc = config.videoConstrain;

        // If the video constrain is not defined.
        if(vc.mandatory === undefined && vc.optional === undefined){
          config.videoConstrain = { mandatory: {}, optional: []}
        }

        // Set the constrain
        setConstrain('video', key, value, level);
      },

      setAudioConstrain: function(key, value, optional){
        var ac = config.audioConstrain;

        // If the audio constrain is not defined.
        if(ac.mandatory === undefined && ac.optional === undefined){
          config.audioConstrain = { mandatory: {}, optional: []}
        }

        setConstrain('audio', key, value, optional);
      },

      setDataConstrain: function(key, value, optional){
        setConstrain('data', key, value, optional);
      },

      $get: function(Erizo, $q, $rootScope){

        var provider = this;

        var service = {

          licodeStream: undefined,
          currentSource: null,
          access: false,
          videoSources: [],
          isHD: false,

          /**
           * Start the camera
           * @param  {int} videoSourceIndex
           * @return {promise}
           */
          start: function(videoSourceIndex){
            var accessDeferred = $q.defer();

            sourcesDeferred.promise.then(function(sourcesSupport){

              if(sourcesSupport){

                var defaultSourceIndex;
                var faceModeSourceIndex;

                // Try to honor facemode constrain when no source is given
                if(config.videoConstrain && config.videoConstrain.optional){
                  // Find if there is a facingMode constrain
                  var constrainValue = _.find(config.videoConstrain.optional, function(c){
                    return _.contains(_.keys(c), 'facingMode');
                  });

                  // If there is one, set that mode as the default source
                  if(constrainValue){
                    var defaultSource = _.find(service.videoSources, function(s){ return s.facing === constrainValue.facingMode; });
                    faceModeSourceIndex = _.indexOf(service.videoSources, defaultSource);
                  }
                }

                // The default source
                defaultSourceIndex = (!faceModeSourceIndex || faceModeSourceIndex < 0)? 0 : faceModeSourceIndex;

                // Store the current video sources
                service.currentSource = (videoSourceIndex != null && videoSourceIndex >= 0)? service.videoSources[videoSourceIndex] : service.videoSources[defaultSourceIndex];

                provider.setVideoConstrain('sourceId', service.currentSource.id, 'optional');
              }

              // Create the stream
              service.licodeStream = Erizo.Stream({
                audio: config.audioConstrain,
                video: true,
                videoSize: config.videoConstrain.videoSize,
                // DEPRECATED videoOptions IN LICODE WILL NOT TAKE ANY EFFECT
                videoOptions: {mandatory: config.videoConstrain.mandatory, optional: config.videoConstrain.optional},
                data: config.dataConstrain
              });

              // When accepted
              service.licodeStream.addEventListener('access-accepted', function (e) {
                $rootScope.$apply(function(){
                  service.access = true;

                  $rootScope.$broadcast('camera-access-accepted');

                  accessDeferred.resolve(e);
                });
              });

              // When denied
              service.licodeStream.addEventListener('access-denied', function (e) {
                $rootScope.$apply(function(){
                  service.access = false;

                  $rootScope.$broadcast('camera-access-denied');

                  accessDeferred.reject(e);
                });
              });

              // Init camera
              service.licodeStream.init();
            });

            return accessDeferred.promise;
          },

          /**
           * Stop the camera, removes event listeners
           */
          stop: function(){

            this.licodeStream.removeEventListener('access-accepted');
            this.licodeStream.removeEventListener('access-denied');
            if (this.licodeStream.stream !== undefined) {
              this.licodeStream.stream.getTracks().forEach(function (track) {
                track.stop();
              });
            }
            this.licodeStream.stream = undefined;

            this.access = false;

          },

          /**
           * Change the camera source,
           * stop and restart camera service with the new source
           * @param  {int} sourceIndex
           * @return {promise}
           */
          toggleSource: function(sourceIndex){
            this.stop();

            var nextIndex;

            if(sourceIndex === undefined){
              nextIndex = (_.indexOf(this.videoSources, this.currentSource) + 1) % this.videoSources.length;
            }
            else{
              nextIndex = sourceIndex;
            }
            return this.start(nextIndex);
          },

          /**
           * Change the camera resolution,
           * stop and restart camera service with the resolution
           * @param  {bool} toggleValue
           * @return {promise}
           */
          toggleHD: function(toggleValue){
            this.stop();

            // The a flag to that expose if the stream is hd
            service.isHD = (toggleValue === undefined)? !service.isHD : toggleValue;

            // The the new resolution
            if(service.isHD){
              provider.setVideoConstrain('minWidth', '1280');
              provider.setVideoConstrain('minHeight', '720');
            }
            else{
              provider.setVideoConstrain('minWidth', '640');
              provider.setVideoConstrain('minHeight', '360');
            }

            return this.start(_.indexOf(this.videoSources, this.currentSource));
          }
        }

        var _self = this;
        var sourcesDeferred = $q.defer();

        // Get the media sources
        try {
          MediaStreamTrack.getSources(function(sources){
            // Store just the video ones
            service.videoSources = _.filter(sources, function(s){
              return s.kind === 'video';
            });

            sourcesDeferred.resolve(true);
          });
        }
        catch(e){
          sourcesDeferred.resolve(false);
        }
        return service;
      }
    };
  });
