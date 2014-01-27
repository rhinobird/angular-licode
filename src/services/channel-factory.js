'use strict';

angular.module('pl-licode-services')
  .factory('channelSocket', function(Erizo, $q){

    function ChannelSocket(token){
      this.token = token;

      this.room = undefined;

      this.stream = undefined;
    }

    // Make the connection
    ChannelSocket.prototype.connect = function(_token){

      var deferred = $q.defer();

      var _self = this;

      var token = _token || _self.token;

      // Create the new room and add the event handlers
      try {
        // Create the room with the new token
        _self.room = Erizo.Room({token: token});

        // Room connected handler
        _self.room.addEventListener('room-connected', function(roomEvent) {
          // Create a new stream for data transmision
          _self.stream = Erizo.Stream({audio: false, video: false, data: true});

          // Add the stream to the room
          _self.room.publish(_self.stream);
        });

        // Room disconnected handler
        _self.room.addEventListener('room-disconnected', function(roomEvent) {
          console.log('room disconnected');
        });

        // Stream added to the rrom
        _self.room.addEventListener('stream-added', function(streamEvent, stream) {
          deferred.resolve(streamEvent, stream);
        });

        // Connect to the room
        _self.room.connect();

      } catch (e){
        console.log('Invalid token');
        _self.room = null;

        deferred.reject();
      }

      return deferred.promise;
    };

    ChannelSocket.prototype.disconnect = function(){
      if(this.stream){
        this.stream.close();
      }

      if(this.room){
        this.room.disconnect();
      }
    };

    ChannelSocket.prototype.broadcastEvent = function(event, params){
      if(this.live){
        this.stream.sendData({
          'event': event,
          params: params
        });
      }
    };

    return new ChannelSocket();
  });
