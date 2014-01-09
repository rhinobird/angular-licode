'use strict';

angular.module('pl-licode-services')
  .service('CameraService', function(Erizo, $q, $rootScope){

    var _self = this;
    var sourcesDeferred = $q.defer();

    this.licodeStream = undefined;
    this.currentSource = null;
    this.access = false;
    this.videoSources = [];

    // Get the media sources
    MediaStreamTrack.getSources(function(sources){
      // Store just the video ones
      _self.videoSources = _.filter(sources, function(s){
        return s.kind === 'video';
      });

      sourcesDeferred.resolve(_self.videoSources);
    });

    /**
     * Start the camera
     * @param  {int} videoSourceIndex
     * @return {promise}
     */
    this.start = function(videoSourceIndex){
      var accessDeferred = $q.defer();

      sourcesDeferred.promise.then(function(){
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

          $rootScope.$broadcast('camera-access-accepted');

          accessDeferred.resolve(e);
        });

        // When denied
        _self.licodeStream.addEventListener('access-denied', function (e) {
          _self.access = false;

          $rootScope.$broadcast('camera-access-denied');

          accessDeferred.reject(e);
        });

        // Init camera
        _self.licodeStream.init();
      });

      return accessDeferred.promise;
    };

    /**
     * Stop the camera, removes event listeners
     */
    this.stop = function(){

      this.licodeStream.removeEventListener('access-accepted');
      this.licodeStream.removeEventListener('access-denied');
      this.licodeStream.close();

      this.access = false;

    };

    /**
     * Change the camera source,
     * stop and restart camera service with the new source
     * @param  {int} sourceIndex
     * @return {promise}
     */
    this.toggleSource = function(sourceIndex){
      this.stop();

      var nextIndex;

      if(sourceIndex === undefined){
        nextIndex = (_.indexOf(this.videoSources, this.currentSource) + 1) % this.videoSources.length;
      }
      else{
        nextIndex = sourceIndex;
      }
      return this.start(nextIndex);
    };
  });
