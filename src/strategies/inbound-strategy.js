'use strict';

angular.module('pl-licode-strategies')
  .factory('inboundStrategy', function(){
    return function(room){

      this.handleRoomDisconnected = function(){
        // Remove the room when disconnected
        room = null;
      };

      this.handleRoomConnected = function(roomEvent, elementId){
        if(roomEvent.streams.length < 1){
          console.log("no stream in this room");
          return;
        }

        // Stream subscribed
        room.addEventListener('stream-subscribed', function(streamEvent) {
          var stream = streamEvent.stream;
          stream.show(elementId);
        });

        // Subscribe to the first stream in the room stream
        room.subscribe(roomEvent.streams[0]);
      };
    };
  });

