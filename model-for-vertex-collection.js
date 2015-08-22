define(['backbone', 'vertexModel', 'io'], function(Backbone, Vertex, io) {
  var socket = io();

  return Backbone.Collection.extend({
    model: Vertex,

    initialize: function( options ) {
      var collection = this;

      socket.on( 'node-added', function(node) {
        collection.add([node]);
      } );

      socket.on( 'node-edited', function(node) {
        var vertex = collection.get(node.id);
        vertex && vertex.set(node);
      } );

      socket.on( 'node-removed', function(node) {
        collection.remove([node]);
      } );

      collection.on("add", function(model) {
        var node = model.toJSON();
        if (node.id) {
          return;
        }
        socket.emit( 'add-node', node );
      });

      collection.on("remove", function(model) {
        socket.emit( 'remove-node', model.toJSON() );
      });

      collection.on('change', function(model, value) {
        socket.emit( 'edit-node', model.toJSON() );
      }, collection);

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
