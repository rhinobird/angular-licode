'use strict';

angular.module('pl-licode-strategies')
  .factory('outboundStrategy', function(CameraService){
    return function(room){
      this.handleRoomDisconnected = function(){
        // Remove the room when disconnected
        room = null;
      };

      this.handleRoomConnected = function(){
        // Stream added to the rrom
        room.addEventListener('stream-added', function(licodeStreamEvent) {
          if (CameraService.licodeStream.getID() === licodeStreamEvent.stream.getID()) {


          }
        });

        // Publish stream to the room
        room.publish(CameraService.licodeStream);
      };
    };
  });
