'use strict';

angular.module('pl-licode-directives')
  .directive('licode', function (CameraService, Erizo, $rootScope) {
    return {
      restrict: 'E',
      replace: true,
      template: '<div class="licode"></div>',
      scope: {
        token: '=',
        mute: '@'
      },
      link: function postLink(scope, element, attrs) {

        var room, stream, elementId;
        var boolTrueTestRx = /yes|true/i;
        var boolFalseTestRx = /no|false/i;

        /**
         * Check if a value is truthy or not based on regex
         * @param  {string}  value the value to check
         * @return {Boolean}
         */
        function isTrue(value){
          return boolTrueTestRx.test(value);
        }

        /**
         * Check if a value is falsy or not based on regex
         * @param  {string}  value the value to check
         * @return {Boolean}
         */
        function isFalse(value){
          return boolFalseTestRx.test(value);
        }

        // Manage and triggers room status
        function updateRoomStatus(){
          if(room){
            var status;
            switch(room.state){
              case 0:
                status = 'disconnected';
                break;
              case 1:
                status = 'connecting';
                break;
              case 2:
                status = 'connected';
                break;
              default:
                status = 'disconnected';
            }

            // Trigger the event
            scope.$emit('licode-room-status-changed', { status: status, room: room });

            //id disconnected set room = null
            if(status === 'disconnected'){
              room = null;
            }
          }
        }

        // Manage and triggers room status
        function updateStreamStatus(status){
          // Trigger the event
          scope.$emit('licode-stream-status-changed', { status: status, stream: stream });

          // Set the stream as null
          if(status === 'removed'){
            stream = null;
          }
        }

        /**
         * Strategies
         */

        /**
         * Handle disconnection for inbound flow
         */
        function inboundRoomDisconnected(){
          // Trigger event for room
          updateRoomStatus();
        }

        /**
         * Handle connection for inbound flow
         * @param  {event} roomEvent
         */
        function inboundRoomConnected(roomEvent){
          // Trigger event for room
          updateRoomStatus();

          if(roomEvent.streams.length < 1){
            console.log('no stream in this room');
            return;
          }

          // Stream subscribed
          room.addEventListener('stream-subscribed', function(streamEvent) {
            scope.$apply(function(){
              // Set the stream variable
              stream = streamEvent.stream;

              // Trigger event for stream
              updateStreamStatus('subscribed');

              // Show the stream in the dom
              stream.show(elementId);

              // Trigger event for the video element created
              scope.$emit('licode-video-created', stream);

              // The the video player mute flag
              stream.player.video.muted = isTrue(scope.mute);
            });
          });

          // Stream removed from the rrom
          room.addEventListener('stream-removed', function(){
            // Trigger event for stream
            updateStreamStatus('removed');
          });

          // Subscribe to the first stream in the room stream
          room.subscribe(roomEvent.streams[0]);
        }

        /**
         * Handle disconnection for outbound flow
         */
        function outboundRoomDisconnected(){
          // Trigger event for room
          updateRoomStatus();
        }

        /**
         * Handle connection for outbound flow
         */
        function outboundRoomConnected(){

          // Trigger event for room
          updateRoomStatus();

          // Stream added to the rrom
          room.addEventListener('stream-added', function(licodeStreamEvent) {
            scope.$apply(function(){
              // Set the stream variable
              stream = licodeStreamEvent.stream;

              // Trigger event for stream
              updateStreamStatus('added');

              // If the stream is the local stream
              if (CameraService.licodeStream.getID() === licodeStreamEvent.stream.getID()) {

                // Start recording this stream
                if(isTrue(attrs.record)){
                  room.startRecording(CameraService.licodeStream, function(recordingId){
                    // Trigger event for stream started recording
                    scope.$emit('licode-stream-recording-started', recordingId);
                  });
                }
              }
            });
          });

          // Stream removed from the rrom
          room.addEventListener('stream-removed', function(){
            // Trigger event for stream
            updateStreamStatus('removed');
          });

          // Publish stream to the room
          room.publish(CameraService.licodeStream);
        }

        // Make the connection
        function connect(token){
          if(room){ return; }

          token = token || scope.token;

          // Create the new room and add the event handlers
          try {
            // Create the room with the new token
            room = Erizo.Room({token: token});

            // Room disconnected handler from strategy
            room.addEventListener('room-disconnected', function(roomEvent) {
              if(attrs.flow === 'inbound'){
                inboundRoomDisconnected(roomEvent);
              }
              else{
                outboundRoomDisconnected(roomEvent);
              }
            });

            // Room connected handler from strategy
            room.addEventListener('room-connected', function(roomEvent) {
              if(attrs.flow === 'inbound'){
                inboundRoomConnected(roomEvent);
              }
              else{
                outboundRoomConnected(roomEvent);
              }
            });

            // Connect to the room
            room.connect();

            // Trigger event for room
            updateRoomStatus();

          } catch (e){
            room = null;
            return;
          }
        }

        function disconnect(){
          // Disconnect if exist a room and it's connected
          if(room && room.state === 2){
            room.disconnect();
          }

          // Set the token in null, as is not usable again because it was already consumed
          scope.token = null;

          // Close the stream
          if(stream){

            if(attrs.flow === 'outbound'){
              stream.removeEventListener('access-accepted');
              stream.removeEventListener('access-denied');
            }
            stream.close();
          }

          // Remove and disconnect from the room
          if(room){
            try{
              room.removeEventListener('room-connected');
              room.removeEventListener('room-disconnected');
              room.removeEventListener('stream-removed');

              if(attrs.flow === 'outbound'){
                room.removeEventListener('stream-added');
              }
              else{
                room.removeEventListener('stream-subscribed');
              }
            } catch (e){}

          }
        }

        // Set an ID
        elementId = (scope.token)? 'licode_' + JSON.parse(window.atob(scope.token)).tokenId : 'licode_' + (new Date()).getTime();
        element.attr('id', elementId);

        // Set video size
        element.css({
          'width': attrs.width,
          'height': attrs.height
        });

        // Initiate the stream (camera/mic permissions)
        if(attrs.flow === 'outbound'){

          // The on or off the stream recording
          attrs.$observe('record', function(){
            // Start recording
            if(isTrue(attrs.record) && scope.token){
              room.startRecording(stream, function(recordingId){
                // Trigger event for stream started recording
                scope.$emit('licode-stream-recording-started', recordingId);
              });
            }

            // Stop recording
            if(isFalse(attrs.record) && scope.token){
              room.stopRecording(stream, function(){
                // Trigger event for stream stoped recording
                scope.$emit('licode-stream-recording-stopped');
              });
            }
          });

          // Create the stream
          CameraService.start().then(function () {
            // Only on outbound, mute stream to avoid mic noise
            CameraService.licodeStream.player.video.muted = isTrue(scope.mute) || true;
          }, function(){
            // FIXME: This is a hack, prevent permition denied without asking
            CameraService.start().then(function () {
              // Only on outbound, mute stream to avoid mic noise
              CameraService.licodeStream.player.video.muted = isTrue(scope.mute) || true;
            });
          });
        }

        // When the token changes to a valid value triggers connection
        scope.$watch('token', function(tokenValue){
          // Connect
          if(isTrue(attrs.on) && tokenValue){
            connect();
          }

        });

        // Turn on or off the licode connection
        attrs.$observe('on', function(){
          // Connect if theres a valid token
          if(isTrue(attrs.on) && scope.token){
            connect();
          }

          // Disconnect
          if(isFalse(attrs.on)){
            disconnect();
          }
        });

        // Mute the current stream
        scope.$watch('mute', function(value){
          if(stream && stream.player){
            stream.player.video.muted = isTrue(value);
          }
        });

        // Show the video when the camera service is accepted
        $rootScope.$on('camera-access-accepted', function(){
          // Create the stream video element
          CameraService.licodeStream.show(elementId);
        });
      }
    };
  });
