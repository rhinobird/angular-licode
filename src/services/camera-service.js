'use strict';

angular.module('licode-services')
  .service('CameraService', function(Erizo, $q){
    this.licodeStream = undefined;
    this.currentSource = null;
    this.access = false;
    this.videoSources = [];

    this.start = function(videoSourceIndex){

      var _self = this;

      // Prepare promise
      var deferred = $q.defer();

      // Get the media sources
      MediaStreamTrack.getSources(function(sources){

        // Store just the video ones
        _self.videoSources = _.filter(sources, function(s){
          return s.kind === 'video';
        });

        // Store the current video sources
        _self.currentSource = _self.videoSources[videoSourceIndex || 0];

        // Data source
        var videoConstrain = {
          optional: [
            {
              sourceId : _self.currentSource.id
            }
          ]
        };

        // Create the stream
        _self.licodeStream = Erizo.Stream({audio: true, video: videoConstrain, data: false});

        // When accepted
        _self.licodeStream.addEventListener('access-accepted', function (e) {
          _self.access = true;

          deferred.resolve(e);
        });

        // When denied
        _self.licodeStream.addEventListener('access-denied', function (e) {
          _self.access = false;

          deferred.reject(e);
        });

        // Init camera
        _self.licodeStream.init();

      });

      return deferred.promise;

    };

    this.stop = function(){

      this.licodeStream.removeEventListener('access-accepted');
      this.licodeStream.removeEventListener('access-denied');
      this.licodeStream.close();

      this.access = false;

    };

    this.toggleCamera = function(){
      this.stop();

      var nextIndex = (_.indexOf(this.videoSources, this.currentSource) + 1) % this.videoSources.length;
      this.start(nextIndex);
    };
  });
