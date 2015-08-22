define(['backbone', 'edgeModel', 'io'], function(Backbone, Edge, io) {
  var socket = io();

  return Backbone.Collection.extend({
    model: Edge,

    initialize: function( options ) {
      var collection = this;

      socket.on( 'link-added', function(link) {
        collection.add([link]);
      } );

      socket.on( 'link-removed', function(link) {
        collection.remove([link]);
      } );

      collection.on("add", function(model) {
        var link = model.toJSON();
        if (link.id) {
          return;
        }
        socket.emit( 'add-link', link );
      });

      collection.on("remove", function(model) {
        socket.emit( 'remove-link', model.toJSON() );
      });

    },

    sync: function() {
      var collection = this;
      socket.on( 'disconnect', function() {
        collection.reset();
      });
      socket.on( 'connect', function() {
        socket.emit('retrieve-all-nodes');
      });
    }

  });

});
