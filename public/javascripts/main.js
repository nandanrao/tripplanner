var test = Handlebars.templates.trip();
document.body.innerHTML = test;
  


var gmaps = (function(){
  // Variables!!
  var api_key = 'AIzaSyBk1GgkGr-z29nhF7AFCKmdNEz472Un5oQ';
  var current_location;
  var googleSearch = new google.maps.places.PlacesService(document.createElement('div'));
  var googleDirections = new google.maps.DirectionsService();

  // store_location needs Modernizer + alerts for error handling / user denying / timeout reminder/ etc!
  var store_location = new Promise(function(resolve, reject) {
    navigator.geolocation.getCurrentPosition(function(position){
      current_location = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
      resolve();
    });
  });

  var lookup = function(place, callback){
    // console.log('gmaps lookup');
    // Check if we have users location, if we don't, get it!
    if (!current_location){
      store_location.then(function(){
        lookup(place, callback)
      })
    }
    // If we have users location, lookup the item!
    else {
      var request = {
        location: current_location,
        radius: '20000',
        keyword: place.name,
      }
      googleSearch.nearbySearch(request, function(results, status){ 
        var error
        if (status !== 'OK'){
          error = status;
          place.deleted = true;
        }
        else {
          // set top result as chose
          place.chosenResult = results[0]
          // push other results to otherResults array
          for (var i=1, len=results.length; i<len; i++){
            place.otherResults.push(results[i]);
          }
          callback(place)
        }
      })
    }
  };

  var distance = function(a, b, callback){
    // console.log(a, b);
    // a and b = {lat, long
    var rando = {
      origin: a.LatLng,
      destination: b.LatLng,
      travelMode: google.maps.TravelMode.TRANSIT, 
    }
    var directionsDisplay = new google.maps.DirectionsRenderer();
    googleDirections.route(rando, function(result, status){
      // console.log(result, status)
      if (status == 'OVER_QUERY_LIMIT') {
        setTimeout(function(){
          distance(a, b, callback)
        }, 500) 
        return;
      }
      // Create div of directions
      var directionsDiv = document.createElement('div');
      directionsDiv.classList.add('directions');
      directionsDiv.setAttribute('data-origin', a._id);
      directionsDiv.setAttribute('data-destination', b._id);
      directionsDisplay.setPanel(directionsDiv);
      directionsDisplay.setDirections(result);
      // callback!
      callback(result.routes[0].legs[0].duration.value/60, directionsDiv)
    });
  };
  
  // API
  return {
    lookup: lookup, 
    distance: distance,
    current_location: current_location,
  }
})();


var routeCalculator = (function(){
  // for each el in arr
  function createLegs(arr){
    // Take off the starting point, create an array to hold results
    var resultsArr = [];
    var start = arr.shift();
    // Add every combination to resultsArr
    arr.forEach(function(el){
      resultsArr.push([start, el]);
      var tempArr = arr.concat();
      tempArr.splice(tempArr.indexOf(el), 1);
      tempArr.forEach(function(otherEl){
        resultsArr.push([el, otherEl])
      });
    });
    // put start back in the front!
    arr.unshift(start)
    // return the array with every possible pair
    return resultsArr;
  }

  // takes an array of pairs, creates objects with durations
  function measureLegs(arr, cb){
    hash = [];
    function getDuration(arr, callback){
      // console.count('getDuration has: ', arr[0].LatLng, arr[1].LatLng)
      gmaps.distance(arr[0], arr[1], function(dur, div){
        console.count('google answered!')
        var obj = {};
        obj.start = arr[0];
        obj.end = arr[1];
        obj.duration = dur;
        obj.directions = div;
        hash.push(obj)
        callback(null)
      });
    };
    async.eachSeries(arr, getDuration, function(err){
      cb(hash)  
    })
  }

  function routes(arr){
    // an array of arrays!
    var start = arr.shift()
    var finalArr = [];
    // resursing function to collect all options!
    function collect(arr, resultsArr){
      var resultsArr = resultsArr || [];
      if (arr.length === 1){
        resultsArr.push(arr[0]);
        resultsArr.unshift(start);
        finalArr.push(resultsArr);
        return; 
      }
      arr.forEach(function(el, i){
        var tempArr = arr.concat();
        var tempResults = resultsArr.concat();

        tempResults.push(el);
        tempArr.splice(tempArr.indexOf(el), 1);

        collect(tempArr, tempResults);
      })
    }
    // run collect
    collect(arr)
    // return start back to it's place!
    arr.unshift(start);
    // return
    return finalArr;
  } 

  // takes an array of arrays of places
  function bestRoute (arr, hash){
    // each array of places
    var newArr = []
    arr.forEach(function(el){
      var routeObj = calculateRoute(el, hash)
      var obj = {
        duration: routeObj.duration,
        places: el,
        directions: routeObj.directions,
      }
      newArr.push(obj);
    })
    // sort by lowest time
    newArr.sort(function(a, b){
      return a.duration - b.duration;
    })
    return newArr[0];
  }

  // takes an array of places (helper for bestRoute)
  function calculateRoute(arr, hash){
    var directions = [];
    var totalDuration = 0;
    for (var i=0, len=arr.length; i<len-1; i++){
      hash.forEach(function(el){
        if (arr[i].g_id === el.start.g_id){
          if (arr[i+1].g_id === el.end.g_id){
            totalDuration += el.duration
            directions.push(el.directions)
          }
        }
      })
    }
    return {
      duration: totalDuration,
      directions: directions,
    }
  };

  // magic ties everything together in the right order!
  var magic = function(arr, callback){
    // Create an array of all possible routes
    var routesArr = routes(arr);    // Create an array of each unique leg in the trip
    var legs = createLegs(arr);
    // Measure the duration of each leg of the trip
    // return an array with all legs and their durations
    measureLegs(legs, function(hash){
      var route = bestRoute(routesArr, hash);
      callback(route)
    });  
  }
  // API
  return {
    calculate: magic,
  }
})();



// Handles submitting of places for bestRoute calculations, and return display... 
var controller = (function(){
  function enterKey(e){
    e.target.style.display = 'none';
    document.getElementById('inputForm').style.display = 'none';
    // check to see if all locations have been found, then calculate best route.
    storage.allFound.then(function(results){
      routeCalculator.calculate(storage.places, function(route){
        // Change the 'pos' property on each place object, based on best route
        for (var i=0, len=route.places.length; i<len; i++){
          route.places[i].pos = i;
          route.places[i].next = route.places[i+1] || null;
          route.places[i].directions = route.directions[i];
          route.places[i].calculated = true;
        }
        // create a duration element and add it (should be template?)
        var dur = document.createElement('li');
        document.getElementById('places').appendChild(dur);
        dur.style.order = route.places.length + 1;
        dur.innerHTML = Math.round(route.duration) + ' min'
        // tell everyone we've calculated the route!
        PubSub.publish('route_calculated', route)
      })
    })
  }
  return {
    enter: enterKey,
  }
})();



// Creates new place objects from form input.
var input = (function(){
  // if store is empty, set counter to 0, else... 
  var counter = 0;
  var createPlaceObj = function(str){
    var place = {
      _id: '_' + Math.random().toString(36).substr(2, 9),
      init_str: str,
      name: str,
      pos : ++counter,
      _chosenResult: null,
      set chosenResult(newPlace){
        // copy the values we care about to main place object
        this.name = newPlace.name;
        this.g_id = newPlace.id;
        this.address = newPlace.vicinity;
        this.LatLng = newPlace.geometry.location;    
        // set our chosenResult object
        this._chosenResult = newPlace;
      },
      get chosenResult(){
        return this._chosenResult;
      },
      otherResults : [],
      deleted: false,
    };
    PubSub.publish('newInput', place) 
  };
  var setCounter = function(num){
    counter = num
  };
  return {
    newInput: createPlaceObj,
  }
})();

// Takes initial input from user
(function(){
var form = document.getElementById('inputForm')
form.onsubmit = function(e){
  var textBox = e.target.elements['input']; 
  input.newInput(textBox.value);
  textBox.value = '';
  return false;
}
})()

// Call gmaps lookup!
PubSub.subscribe('newInput', function(msg, place){
  place.found = new Promise(function(resolve, reject){
      gmaps.lookup(place, resolve)
  });
});


var viewOfPlace = (function(){
  var newPlace = function(place){
    // Create the (li) DOM element for this place (var el)
    var li = Handlebars.templates.place(place);
    var tempWrapper = document.createElement('ul');
    tempWrapper.innerHTML = li;
    el = tempWrapper.firstChild;

    // object to hold DOM elements
    li = {
      el : el,
      name: el.getElementsByClassName('name')[0],
      address: el.getElementsByClassName('address')[0],
      open: false,
    };

    li.address.innerHTML = place.address || null;
    // Create button to delete element
    li.deleteBtn = document.createElement('span')
    li.deleteBtn.innerHTML = 'delete';
    li.deleteBtn.classList.add('delete');
    li.deleteBtn.onclick = function(){
      place.deleted = true;
    };
    // Create button to show other results
    li.changeBtn = document.createElement('span');
    li.changeBtn.innerHTML = 'other';
    li.changeBtn.classList.add('change');
    li.changeBtn.onclick = function(){
      showOtherResults();
    }
    // function to show above buttons
    var showControlBtns = function(){
      if(!li.open && !place.calculated){
        li.deleteBtn.style.display = 'flex'; 
        li.changeBtn.style.display = 'flex';
      }
    }
    // function to hide above buttons
    var hideControlBtns = function(){
      li.deleteBtn.style.display = 'none';
      li.changeBtn.style.display = 'none';  
    }
    // mouse events to show/hide control buttons on mouseover
    li.el.addEventListener('mouseover', showControlBtns);
    li.el.addEventListener('mouseout', hideControlBtns);
    // appen the buttons!
    li.el.appendChild(li.changeBtn);
    li.el.appendChild(li.deleteBtn);
    // Append (li) element for this place
    document.getElementById('places').appendChild(li.el);
    // Create DOM element for alternate results for this place
    var ul = document.createElement('ul')
    ul.classList.add('alternates');
    // Add a click event for each place (to show alternates)
    li.name.onclick = function(){
      if (!!place.calculated){
        showDirections()
      }
      else {
        showOtherResults();
      }
    }
    function showDirections(){
      if (!li.open){
        if (!!place.directions){
          li.el.appendChild(place.directions);
          li.open = true;  
          li.el.classList.toggle('list-open');
        }
      }
      else if (li.open){
        li.el.removeChild(place.directions);
        li.open = false;
        li.el.classList.toggle('list-open');
      }
    }
    function showOtherResults(){
      if (place.otherResults.length < 1){
        return
      }
      if (!li.open){
        hideControlBtns();
        ul.style.display = 'block';
        li.open = true;
        ul.innerHTML = Handlebars.templates.alternates(place);
        li.el.appendChild(ul);
        // add click event to each alternate place to make it THE place!
        for (var i=0, len=ul.children.length; i<len; i++){   
          ul.children[i].onclick = function(e){
            var g_id = this.getAttribute('data-google-id');
            place.otherResults.forEach(function(el, i){
              if (el.id === g_id){
                var tempEl = place.chosenResult;
                place.chosenResult = el;
                place.otherResults.splice(i, 1);
                place.otherResults.unshift(tempEl);
              }
            })
            this.parentNode.innerHTML = '';
            li.open = false;
          }
        }
      }
      else if (li.open){
        li.open = false;
        ul.innerHTML = '';
      }
    }

    // Put a listener on each place object to bind view to object properties
    Object.observe(place, function(changes){
      PubSub.publish('object_change', changes)
      changes.forEach(function(change){
        if (change.name === 'g_id'){
          li.name.innerHTML = place.name;
          li.address.innerHTML = place.address;
        } 
        if (change.name === 'pos'){
          li.el.style.order = place.pos;
        }
        if (change.name === 'deleted'){
          li.el.style.display = 'none';
          storage.destroy(place._id);
          Object.unobserve(place);
        }
      })
    })
  }

  return {
    newPlace : newPlace,
  }

})();


// View Changes on new input
PubSub.subscribe('newInput', function(msg, place){
  viewOfPlace.newPlace(place);
});

PubSub.subscribe('rebuildTrip', function(msg, place){
  viewOfPlace.newPlace(place);
});


// Show CALCULATE button when at least 3 places are entered.  
PubSub.subscribe('stored_places', function(msg, places){
  var calculateBtn = document.getElementById('calculate')
  if (storage.places.length > 2){
    calculateBtn.style.display = 'inline-block'; 
    calculateBtn.onclick = controller.enter;
  }
  else {
    calculateBtn.style.display = 'none';
  }
}) 


// Stores all our place objects in a nice array!
var storage = (function(){


  var places = [];

  places.forEach(function(place){
    PubSub.publish('rebuildTrip', place)
  });

  PubSub.subscribe('object_change', function(msg, changes){
    // addToDB(changes[0].object)
    // storeLocal();
    // console.log('store!', window.localStorage.getItem('trip'))
  })

  function set(place){
    places.push(place)
    PubSub.publish('stored_places', places)
  }

  function findById(id){
    places.forEach(function(place){
      if (place._id === id){
        return place
      }
    })
  }

  var allFound = new Promise (function (resolve, reject){
    var foundArray = [];
    places.forEach(function(place){
      foundArray.push(place.found)
    })
    Promise.all(foundArray).then(resolve())
  })

  function destroy(id){
    var i = places.indexOf(findById(id))
    places.splice(i);
    PubSub.publish('stored_places', places)
  }

  PubSub.subscribe('newInput', function(msg, obj){
    set(obj);
    // addToDB(obj);
  });

  var db;
  var request = indexedDB.open('tripplanner', 4);
  request.onupgradeneeded = function(e){
    console.log("upgrade!")
    db = e.target.result
    if (db.objectStoreNames.contains('trip')){
      db.deleteObjectStore('trip');
    }
    db.createObjectStore('trip', {keyPath: '_id'});
  }
  request.onsuccess = function(e){
    console.log('succes?')
    db = e.target.result;
  }
  request.onerrer = function(e){
    console.log('weird db error:', e)
  }

  function addToDB(obj){
    var transaction = db.transaction(['trip'], 'readwrite');
    var store = transaction.objectStore('trip')
    var request = store.put(obj);
    request.onsuccess = function(e){
      console.log('succes!!!', request.result)
    }
    request.onerror = function(e){
      console.log('error', e)
    }
  }

  function getFromDB(id){
    var transaction = db.transaction(['trip']);
    var store = transaction.objectStore('trip')
    var request = store.get(id);
    request.onsuccess = function(e){
      console.log('get', e, request.result)
    }
    request.onerror = function(e){
      console.log('error', e)
    }
  }

  function updateDB(obj){
    var transaction = db.transaction(['trip'], 'readwrite');
    var store = transaction.objectStore('trip')
    var request = store.get(obj._id);
    request.onsuccess = function(e){
      console.log('updated first', request.result)
      var requestUpdate = store.put(obj)
      requestUpdate.onerror = function(e){
        console.log('error?')
      }
      requestUpdate.onsuccess = function(e){
        console.log('totally updated', e)
      }
    }
    request.onerror = function(e){
      console.log('error', e)
    } 
  }

  return {
    places: places,
    destroy: destroy,
    allFound: allFound,
    get: getFromDB,
  }
})();
