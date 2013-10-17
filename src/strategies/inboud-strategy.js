'use strict';

angular.module('licode-strategies')
  .factory('inboundStrategy', function(CameraService){
    return function(room){
      this.handleRoomDisconnected = function(){
        // Remove the room when disconnected
        room = null;
      };

      this.handleRoomConnected = function(){
        if(roomEvent.streams.length < 1){
          console.log("invalid stream");
          return;
        }

        // Stream subscribed
        room.addEventListener('stream-subscribed', function(licodeStreamEvent) {
          CameraService.licodeStream = licodeStreamEvent.stream;
          CameraService.licodeStream.show(elementId);
        });

        // Subscribe to the first stream in the room stream
        room.subscribe(roomEvent.streams[0]);
      };
    };
  });
