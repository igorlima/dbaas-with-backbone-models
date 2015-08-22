
var express    = require('express'),
    mongoose   = require('mongoose'),
    bodyParser = require('body-parser'),
    app    = express(),
    http   = require('http').Server(app),
    io     = require('socket.io')(http),
    extend = require('extend'),
    async  = require('async'),

    // Mongoose Schema definition
    Edge = mongoose.model('Edge', {
      id: String,
      source: {
        id: String,
        weight: Number
      },
      target: {
        id: String,
        weight: Number
      }
    }),

    Vertex = mongoose.model('Vertex', {
      id: String,
      color: String,
      label: String
    });

/*
 * I’m sharing my credential here.
 * Feel free to use it while you’re learning.
 * After that, create and use your own credential.
 * Thanks.
 *
 * COMPOSE_URI=mongodb://example:example@dogen.mongohq.com:10087/dbaas-with-backbone-models
 * COMPOSE_URI=mongodb://example:example@127.0.0.1:27017/dbaas-with-backbone-models
 */
mongoose.connect(process.env.COMPOSE_URI, function (error) {
    if (error) console.error(error);
    else console.log('mongo connected');
});
/** END */


app
  .use(express.static(__dirname + '/'))
  // https://scotch.io/tutorials/use-expressjs-to-get-url-and-post-parameters
  .use(bodyParser.json()) // support json encoded bodies
  .use(bodyParser.urlencoded({ extended: true })) // support encoded bodies
  ;

http.listen(process.env.PORT || 5000, function(){
  console.log('listening on *:5000');
});

io.on('connection', function(socket) {

  function removeLinkIfNodeWasDeleted(linkId, nodeId) {
    Vertex.findById( nodeId, function(err, vertex) {
      if (vertex) {
        return;
      }
      Edge.findById(linkId, function(err, link) {
        console.warn( 'link removed to clean up the db: ' + linkId );
        link && link.remove();
      });
    } );
  }

  function cleanUpLinkIfNeeded(link) {
    if (!link.source || !link.target) {
      console.warn( 'link removed to clean up the db: ' + link.id );
      link.remove();
    } else {
      removeLinkIfNodeWasDeleted( link.id, link.source.id );
      removeLinkIfNodeWasDeleted( link.id, link.target.id );
    }
  }

  console.log('a user connected');
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });

  socket.on('retrieve-all-nodes-and-edges', function() {
    Vertex.find( function( err, nodes) {
      nodes.forEach(function(node) {
        node.id = node._id;
        socket.emit( 'node-added', node );
      });
      Edge.find( function(err, links) {
        links.forEach(function(link) {
          link.id = link._id;
          socket.emit( 'link-added', link );
          cleanUpLinkIfNeeded( link );
        });
      } );
    });
  });

  socket.on('add-node', function( node ) {
    var vertex = new Vertex( node );
    node.id = vertex._id;
    vertex.save(function (err) {
      socket.broadcast.emit( 'node-added', node );
      socket.emit( 'node-added', node );
    });
  });

  socket.on('edit-node', function(node) {
    if (node && node.id) {
      Vertex.findById( node.id, function (err, vertex) {
        vertex.label = node.label;
        vertex.color = node.color;
        vertex.save( function(err) {
          socket.emit( 'node-edited', node );
          socket.broadcast.emit( 'node-edited', node );
        });
      } );
    }
  } );

  socket.on('remove-node', function(node) {
    if (node && node.id) {
      Vertex.findById( node.id, function(err, vertex) {
        vertex && vertex.remove( function(err) {
          socket.emit( 'node-removed', node );
          socket.broadcast.emit( 'node-removed', node );
        });
      } );
    }
  });

  socket.on('add-link', function(link) {
    var edge = new Edge( link );
    link.id = edge._id;

    async.waterfall([
      //save SOURCE if it's not exist
      function(callback) {
        var id = link.source && link.source.id;
        if (id) Vertex.findById( id, callback );
        else callback(null, null);
      },
      function(vertex, callback) {
        if (vertex) callback(null, null);
        else Vertex.create(link.source, callback);
      },
      function(vertex, callback) {
        if (vertex) {
          link.source.id = vertex._id;
          socket.emit( 'node-added', link.source );
        }
        callback();
      },
      //save TARGET if it's not exist
      function(callback) {
        var id = link.target && link.target.id;
        if (id) Vertex.findById( id, callback );
        else callback(null, null);
      },
      function(vertex, callback) {
        if (vertex) callback(null, null);
        else Vertex.create(link.target, callback);
      },
      function(vertex, callback) {
        if (vertex) {
          link.target.id = vertex._id;
          socket.emit( 'node-added', link.target );
        }
        callback();
      }
    ], function (err) {
      err || edge.save( function(err) {
        socket.broadcast.emit( 'node-added', link.source );
        socket.broadcast.emit( 'node-added', link.target );

        socket.broadcast.emit( 'link-added', link );
        socket.emit( 'link-added', link );
      } );
    });

  });

  socket.on('remove-link', function(link) {
    if (link && link.id) {
      Edge.findById( link.id, function(err, edge) {
        edge && edge.remove( function(err) {
          socket.broadcast.emit( 'link-removed', link );
          socket.emit( 'link-removed', link );
        } );
      });
    }
  });

});

