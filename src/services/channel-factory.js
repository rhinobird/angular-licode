'use strict';

angular.module('pl-licode-services')
  .factory('channelSocket', function(Erizo, $q){

    function ChannelSocket(token){
      this.token = token;

      this.room = undefined;

      this.stream = undefined;

      this.flow = 'outbound';
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
          if(_self.flow === 'inbound'){
            if(roomEvent.streams.length < 1){
              console.log('no stream in this room');
              return;
            }

            var stream = roomEvent.streams[0];

            // Set the stream variable
            _self.stream = stream;

            // Stream added to the rrom
            _self.room.addEventListener('stream-subscribed', function(streamEvent, _stream) {
              deferred.resolve(streamEvent, _stream);
            });

            // Subscribe to the first stream in the room stream
            _self.room.subscribe(stream);
          }
          else{
            // Create a new stream for data transmision
            _self.stream = Erizo.Stream({audio: false, video: false, data: true});

            // Initialize the stream
            _self.stream.init();

            // Stream added to the rrom
            _self.room.addEventListener('stream-added', function(streamEvent, stream) {
              deferred.resolve(streamEvent, stream);
            });
            // Add the stream to the room
            _self.room.publish(_self.stream);
          }
        });

        // Room disconnected handler
        _self.room.addEventListener('room-disconnected', function() {
          // Remove and disconnect from the room
          if(_self.room){
            try{
              _self.room.removeEventListener('room-connected');
              _self.room.removeEventListener('room-disconnected');

              if(_self.flow === 'outbound'){
                _self.room.removeEventListener('stream-added');
              }
              else{
                _self.room.removeEventListener('stream-subscribed');
              }
            } catch (e){}
          }
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
      if(this.stream){
        this.stream.sendData({
          'event': event,
          params: params
        });
      }
    };

    return function(token){
      return new ChannelSocket(token);
    };
  });
