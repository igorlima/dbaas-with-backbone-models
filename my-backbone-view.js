
define(['jquery', 'backbone', 'modalModel', 'edgeCollection', 'vertexCollection', 'forceView'], function($, Backbone, ModalModel, EdgeCollection, VertexCollection, ForceView) {

  return Backbone.View.extend({
    el: 'body',
    events: {
      'click button.add-node': 'addNode',
      'click #editNodeModal button.btn.btn-primary': 'editNode',
      'change #textNode': 'textChanged',
      'changeColor #textColorNode': 'colorChanged'
    },

    initialize: function( options ) {
      var view = this;
      view.modalModel = new ModalModel();
      view.$el.find('#textColorNode').colorpicker();

      ForceView.trigger('init', function() {
        view.edgeCollection = new EdgeCollection();
        view.vertexCollection = new VertexCollection();
        view.sync();
      });
    },

    textChanged: function() {
      this.modalModel.set( 'label', this.$el.find('#textNode').val(), { silent: true } );
    },

    colorChanged: function() {
      this.modalModel.set( 'color', this.$el.find('#textColorNode').val(), { silent: true } );
    },

    openModal: function() {
      this.$el.find('#editNodeModal').modal('show');
    },

    hideModal: function() {
      this.$el.find('#editNodeModal').modal('hide');
    },

    editNode: function() {
      var vertexModel = this.vertexCollection.get( this.modalModel.get('id') );
      vertexModel.set( {
        color: this.modalModel.get('color'),
        label: this.modalModel.get('label')
      } );
      this.hideModal();
    },

    addNode: function() {
      this.vertexCollection.add([{}]);
    },

    sync: function() {
      var view = this;

      view.modalModel.on('change:color', function(modalModel, color) {
        view.$el.find('#textColorNode').val( color );
      });
      view.modalModel.on('change:label', function(modalModel, label) {
        view.$el.find('#textNode').val( label );
      });

      view.syncWithForceView();
      view.syncWithDBaaS();
      console.log('ready!! backbone view loaded and sync');
    },

    syncWithDBaaS: function() {
      var view = this;

      view.vertexCollection.on('add', function(model) {
        ForceView.trigger('add-node', model.toJSON() );
        ForceView.trigger('remove-node', {});
      });

      view.vertexCollection.on('remove', function(model) {
        ForceView.trigger('remove-node', model.toJSON());
      } );

      view.vertexCollection.on('change', function(model, value) {
        ForceView.trigger('edit-node', model.toJSON());
      } );

      view.vertexCollection.on('reset', function() {
        ForceView.trigger('init');
      });

      view.edgeCollection.on('add', function(model) {
        var edge = model.toJSON();
        edge.id && ForceView.trigger('add-link', edge);
      });

      view.edgeCollection.on('remove', function(model) {
        ForceView.trigger('remove-link', model.toJSON());
      });

      view.edgeCollection.on('reset', function() {
        ForceView.trigger('init');
      });

      view.vertexCollection.sync();
      view.edgeCollection.sync();
    },

    syncWithForceView: function() {
      var view = this;

      ForceView.on('node-removed', function(node) {
        view.vertexCollection.remove([node.id]);
      });

      ForceView.on('node-edited', function(node) {
        view.modalModel.set({
          id: node.id,
          color: node.color,
          label: node.label
        });
        view.openModal();
      });

      ForceView.on('link-added', function(link) {
        ForceView.trigger('remove-link', link);
        //it will be added later, after the server sent back the id.
        view.edgeCollection.add([link]);
      });

      ForceView.on('link-removed', function(link) {
        view.edgeCollection.remove([link.id]);
      });

      ForceView.on('node-and-link-added', function(data) {
        view.edgeCollection.add([data.link]);
      });

      ForceView.trigger('remove-node', {});
    }

  });

});
