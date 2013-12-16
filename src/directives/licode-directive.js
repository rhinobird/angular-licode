'use strict';

angular.module('pl-licode-directives')
  .directive('licode', function (CameraService, Erizo, $injector) {
    return {
      restrict: 'E',
      replace: true,
      template: '<div></div>',
      scope: true,
      link: function postLink(scope, element, attrs) {

        var room, stream, elementId;

        /**
         * Strategies
         */

        // Inbound
        function inboundRoomDisconnected(roomEvent){
          // Remove the room when disconnected
          room = null;
        };

        function inboundRoomConnected(roomEvent){
          if(roomEvent.streams.length < 1){
            console.log("no stream in this room");
            return;
          }

          // Stream subscribed
          room.addEventListener('stream-subscribed', function(streamEvent) {
            stream = streamEvent.stream;
            stream.show(elementId);

            // Trigger event for the video element created
            scope.$emit('stream-video-created', stream);

            // The the video player mute flag
            stream.player.video.muted = attrs.mute === "true" || false;
          });

          // Subscribe to the first stream in the room stream
          room.subscribe(roomEvent.streams[0]);
        };

        // Outbound
        function outboundRoomDisconnected(roomEvent){
          // Remove the room when disconnected
          room = null;
        };

        function outboundRoomConnected(roomEvent){
          // Stream added to the rrom
          room.addEventListener('stream-added', function(licodeStreamEvent) {
            if (CameraService.licodeStream.getID() === licodeStreamEvent.stream.getID()) {

            }
          });

          // Publish stream to the room
          room.publish(CameraService.licodeStream);
        };

        // Make the connection
        function connect(token){
          var token = token || attrs.token;

          // Create the new room and add the event handlers
          try {
            // Create the room with the new token
            room = Erizo.Room({token: token});

            // Room disconnected handler from strategy
            room.addEventListener('room-disconnected', function(roomEvent) {
              if(attrs.flow == 'inbound'){
                inboundRoomDisconnected(roomEvent);
              }
              else{
                outboundRoomDisconnected(roomEvent);
              }
            });

            // Room connected handler from strategy
            room.addEventListener('room-connected', function(roomEvent) {
              if(attrs.flow == 'inbound'){
                inboundRoomConnected(roomEvent);
              }
              else{
                outboundRoomConnected(roomEvent);
              }
            });

            // Connect to the room
            room.connect();

          } catch (e){
            console.log('Invalid token');
            room = null;
            return;
          }
        };

        function disconnect(){
          // Disconnect if exist a room and it's connected
          if(room && room.state === 2){
            room.disconnect();
          }

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
        };

        // Get the connect flag from the attrs
        function isOn(){
          var state;
          try{
            state = JSON.parse(attrs.on);
          }
          catch (e){
            state = false;
          }
          return state;
        };

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

        attrs.$observe('token', function(tokenValue, oldTokenValue){
          console.log('Token changed: ', tokenValue, oldTokenValue, isOn());

          // Connect
          if(isOn() && tokenValue){
            connect();
          }

        });

        // Turn on or off the licode connection
        attrs.$observe('on', function(){
          // Connect
          if(isOn() && attrs.token){
            connect();
          }

          // Disconnect
          if(!isOn()){
            disconnect();
          }
        });

        // Mute the current stream
        attrs.$observe('mute', function(value){
          if(stream){
            stream.player.video.muted = value === 'true';
          }
        });
      }
    };
  });
