var map;
var socket;
var markers = [];
var lines = [];

function guid() {
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}

function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
}

function newMarker(id, pos) {
    var lineSymbol = {
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 5,
        strokeColor: '#35F',
        strokeOpacity: 1
    };

    var marker = new google.maps.Marker({
        position: pos,
        animation: google.maps.Animation.DROP,
        icon: lineSymbol,
        id: id,
        draggable: true,
        map:map
    });

    google.maps.event.addListener(marker, 'dragend', function() {
        console.log('New marker position ' + marker.getPosition().lat() +
                    ', ' + marker.getPosition().lng());
        socket.emit('move pin', {id: marker.id, pos: marker.getPosition() });
    });
    return marker;
}

function animateCircle(line, marker, pos) {
    var count = 0;
    var interval = window.setInterval(function() {
        count = (count + 1) % 200;

        var icons = line.get('icons');
        icons[0].offset = (count / 2) + '%';
        line.set('icons', icons);
        if(count === 199) {
            window.clearInterval(interval);
            marker.setPosition(pos);
        }
    }, 5);
}

function moveMarker(id, pos) {
    var marker = markers.find(function(m) { return m.id === id; });
    if (marker === undefined) {
        console.log('unable to move non-existent marker ' + id + '. Adding it instead.');
        markers.push(newMarker(id, pos));
        return;
    }
    console.log('Moving ' + marker);
    marker.setVisible(false);

    var symbol = marker.getIcon();

    //Look for an existing line
    var line = lines.find(function(l) { return l.id === id; });
    if (line === undefined) {
        //Create the line for the symbol to follow
        line = new google.maps.Polyline();
        lines.push(line);
    }
    //update the path and offset
    line.setOptions(
        {
            path: [marker.getPosition(), pos],
            icons: [{
                icon: symbol,
                offset: '100%'
            }],
            strokeWeight: 1,
            strokeOpacity: 0,
            id: id,
            map: map
        });

    animateCircle(line, marker, pos);
}

function manageMarkers(event) {
    console.log(event.latLng.lat() + ', ' + event.latLng.lng());

    //Probably need this to be a data structure so we can handle
    // many points
    var marker = newMarker(guid(), event.latLng);
    markers.push(marker);
    socket.emit('new pin', {id: marker.id, pos: event.latLng});
}

function initMap(position) {
    var center = undefined === position ?
            //           new google.maps.LatLng(39.775769,-95.449850) :
            new google.maps.LatLng(37.516125576702755, -122.2708797454834) :
            new google.maps.LatLng(position.coords.latitude,
                                   position.coords.longitude);
    var mapProp = {
        center: center,
        zoom: 14,
        disableDefaultUI: true,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map=new google.maps.Map(document.getElementById("googleMap"),mapProp);
    //Get the lat long from a pin drop
    google.maps.event.addListener(map, 'click', manageMarkers);
}

function initialize() {
    socket = io();

/*    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(initMap);
    } else {
        console.log('Geoloc not supported');
        initMap();
    }
 */
    initMap();

    socket.on('new pin', function(m) {
        console.log("Received remote pin generation for " +
                    m.id + " at (" +
                    m.pos.lat + ', ' + m.pos.lng + ')');
        markers.push(newMarker(m.id, m.pos));
    });

    socket.on('move pin', function(m) {
        console.log("Received remote pin movement at (" +
                    m.pos.lat + ', ' + m.pos.lng + ')');
        moveMarker(m.id, m.pos);
    });
}
