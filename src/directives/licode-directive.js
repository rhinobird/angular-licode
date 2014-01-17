'use strict';

angular.module('pl-licode-directives')
  .directive('licode', function (CameraService, Erizo, $rootScope) {
    return {
      restrict: 'E',
      replace: true,
      template: '<div></div>',
      scope: true,
      link: function postLink(scope, element, attrs) {

        var room, stream, elementId;
        var boolTestRx = /yes|true/i;

        // Manage and triggers room status
        function updateRoomStatus(){
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

          //id disconnected set room = null
          if(status === 'disconnected'){
            room = null;
          }

          // Trigger the event
          scope.$emit('licode-room-status-changed', { status: status, room: room });
        }

        // Manage and triggers room status
        function updateStreamStatus(status){
          if(status === 'removed'){
            stream = null;
          }

          // Trigger the event
          scope.$emit('licode-stream-status-changed', { status: status, stream: stream });
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

            // Set the stream variable
            stream = streamEvent.stream;

            // Trigger event for stream
            updateStreamStatus('subscribed');

            // Show the stream in the dom
            stream.show(elementId);

            // Trigger event for the video element created
            scope.$emit('licode-video-created', stream);

            // The the video player mute flag
            stream.player.video.muted = attrs.mute === 'true' || false;
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
         * Handle disconnection for outbound flow
         */
        function outboundRoomConnected(){

          // Trigger event for room
          updateRoomStatus();

          // Stream added to the rrom
          room.addEventListener('stream-added', function(licodeStreamEvent) {

            // Set the stream variable
            stream = licodeStreamEvent.stream;

            // Trigger event for stream
            updateStreamStatus('added');

            // If the stream is the local stream
            if (CameraService.licodeStream.getID() === licodeStreamEvent.stream.getID()) {

              // Start recording this stream
              if(boolTestRx.test(attrs.record)){
                room.startRecording(CameraService.licodeStream);
              }

              // Trigger event for the video element created
              scope.$emit('licode-stream-added', licodeStreamEvent.stream);
            }
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

          token = token || attrs.token;

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
            room.removeEventListener('stream-added');
            room.removeEventListener('stream-removed');
            room.disconnect();
          }
        }

        // Set an ID
        elementId = (attrs.token !== '')? 'licode_' + JSON.parse(window.atob(attrs.token)).tokenId : 'licode_' + (new Date()).getTime();
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
            if(boolTestRx.test(attrs.record) && attrs.token){
              room.startRecording(stream);
            }

            // Stop recording
            if(!boolTestRx.test(attrs.record) && attrs.token){
              room.stopRecording(stream);
            }
          });

          // Create the stream
          CameraService.start().then(function () {
            // Only on outbound, mute stream to avoid mic noise
            CameraService.licodeStream.player.video.muted = attrs.mute || true;
          }, function(){
            // FIXME: This is a hack, prevent permition denied without asking
            CameraService.start().then(function () {
              // Only on outbound, mute stream to avoid mic noise
              CameraService.licodeStream.player.video.muted = attrs.mute || true;
            });
          });
        }

        // When the token changes to a valid value triggers connection
        attrs.$observe('token', function(tokenValue){
          // Connect
          if(boolTestRx.test(attrs.on) && tokenValue){
            connect();
          }

        });

        // Turn on or off the licode connection
        attrs.$observe('on', function(){
          // Connect if theres a valid token
          if(boolTestRx.test(attrs.on) && attrs.token){
            connect();
          }

          // Disconnect
          if(!boolTestRx.test(attrs.on)){
            disconnect();
          }
        });

        // Mute the current stream
        attrs.$observe('mute', function(value){
          if(stream){
            stream.player.video.muted = value === 'true';
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
