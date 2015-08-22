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

      collection.on("add", function(link) {
        socket.emit( 'add-link', link );
      });

      collection.on("remove", function(link) {
        socket.emit( 'remove-link', link );
      });

    },

    sync: function() {
      socket.emit('retrieve-all-nodes');
    }

  });

});
