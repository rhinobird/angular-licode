'use strict';

angular.module('licode-directives')
  .directive('licode', function (CameraService, Erizo, $injector) {
    return {
      restrict: 'E',
      replace: true,
      template: '<div></div>',
      scope: {
        token: '@'
      },
      link: function postLink(scope, element, attrs) {

        var room, elementId, strategy;

        // Set an ID
        elementId = (scope.token !== '')? 'licode_' + JSON.parse(window.atob(scope.token)).tokenId : 'licode_' + (new Date()).getTime();
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
            CameraService.licodeStream.player.video.muted = true;
          });
        }

        scope.$watch('token', function(value, oldValue){
          console.log('Token changed: ', value, oldValue);
          // Disconnect if exist a room and it's connected
          if(room && room.state === 2){
            room.disconnect();
          }

          // Return if not token defined
          if(!value){
            return;
          }

          // Create the new room
          try {
            room = Erizo.Room({token: value});
            room.connect();
          } catch (e){
            console.log('Invalid token');
            return;
          }

          // Get the current strategy
          strategy = new $injector.get(attrs.flow + 'Strategy')(room);

          // Room connected handler
          room.addEventListener('room-disconnected', function(roomEvent) {
            strategy.handleRoomDisconected();
          });

          room.addEventListener('room-connected', function(roomEvent) {
            strategy.handleRoomConnected();
          });
        });
      }
    };
  });
