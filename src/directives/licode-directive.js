'use strict';

angular.module('pl-licode-directives')
  .directive('licode', function (CameraService, Erizo, $injector) {
    return {
      restrict: 'E',
      replace: true,
      template: '<div></div>',
      link: function postLink(scope, element, attrs) {

        var room, stream, elementId, strategy;

        // Set an ID
        elementId = (attrs.token !== '')? 'licode_' + JSON.parse(window.atob(attrs.token)).tokenId : 'licode_' + (new Date()).getTime();
        element.attr('id', elementId);

        // Set video size
        element.css({
          'width': attrs.width,
          'height': attrs.height
        });

        // Initiate the stream (camera/mic permissions)
        if(attrs.flow === "outbound"){

          // Create the stream
          CameraService.start().then(function () {
            CameraService.licodeStream.show(elementId);

            // Only on outbound, mute stream to avoid mic noise
            CameraService.licodeStream.player.video.muted = attrs.mute || true;
          });
        }

        attrs.$observe('token', function(value, oldValue){
          console.log('Token changed: ', value, oldValue);

          // Disconnect if exist a room and it's connected
          if(room && room.state === 2){
            room.disconnect();
          }

          // Disconnect, close and return if not token defined
          if(!value){

            // Close the stream
            if(stream){
              stream.removeEventListener('access-accepted');
              stream.removeEventListener('access-denied');
              stream.close();
            }

            // Remove and disconnect from the room
            if(room){
              room.removeEventListener('room-connected');
              room.removeEventListener('room-disconnected');
              room.disconnect();
            }

            return;
          }


          // Create the new room and add the event handlers
          try {
            // Create the room with the new token
            room = Erizo.Room({token: value});

            // Get the current strategy
            strategy = new ($injector.get(attrs.flow + 'Strategy'))(room);

            // Room disconnected handler from strategy
            room.addEventListener('room-disconnected', function(roomEvent) {
              strategy.handleRoomDisconnected(roomEvent, elementId);
            });

            // Room connected handler from strategy
            room.addEventListener('room-connected', function(roomEvent) {
              strategy.handleRoomConnected(roomEvent, elementId);
            });

            // Connect to the room
            room.connect();

          } catch (e){
            console.log('Invalid token');
            room = null;
            return;
          }

        });

        // Mute the current stream
        attrs.$observe('mute', function(value){

        });
      }
    };
  });
