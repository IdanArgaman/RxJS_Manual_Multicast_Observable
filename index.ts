import { of, Observable } from 'rxjs'; 
import { map } from 'rxjs/operators';

/* NOTE
   **** 
  When we create an observable (by using Observable.create or using the constructor)
  we pass a SUBSCRIBER function as a parameter. This function gets called when we
  subscribe to the observable. Remember, when we subscribe to the observable, we provide
  an observer to the subscribe method.
*/

function multicastSequenceSubscriber() {

  // const seq = [...Array(10).keys()]; // ES6
  
  const seq = [1,2,3,4,5,6,7,8,9,10];

  // Keep track of each observer (one for every active subscription)

  const observers = [];
  // Still a single timeoutId because there will only ever be one
  // set of values being generated, multicasted to each subscriber

  let timeoutId;

  // Subscriber function as closure

  // Return the subscriber function (runs when subscribe()
  // function is invoked)
  return (observer) => {

    observers.push(observer);

    // *** Only *** when this is the first subscription, start the sequence

    if (observers.length === 1) {

      timeoutId = doSequence({
        next(val) {
          // Iterate through observers and notify all subscriptions
          observers.forEach(obs => obs.next(val));
        },
        complete() {
          // Notify all complete callbacks

          // Note: slice() always returns a new array - the array returned by slice(0) is identical to the input,
          // which basically means it's a cheap way to duplicate an array.
          observers.slice(0).forEach(obs => obs.complete());
        }
      }, seq, 0);
    }

    return {
      unsubscribe() {

        // Remove from the observers array so it's no longer notified
        // note how we remove only the current observer

        observers.splice(observers.indexOf(observer), 1);

        // If there's no more listeners, do cleanup
        if (observers.length === 0) {
          clearTimeout(timeoutId);
        }
      }
    };
  };
}

// Run through an array of numbers, emitting one value
// per second until it gets to the end of the array.
function doSequence(observer, arr, idx) {
  return setTimeout(() => {
    observer.next(arr[idx]);
    if (idx === arr.length - 1) {
      observer.complete();
    } else {
      doSequence(observer, arr, ++idx);
    }
  }, 1000);
}

// Create a new Observable that will deliver the above sequence
const multicastSequence = new Observable(

  // We call a function because the subscriber is actually the return value
  // of this function, so this is a factory function, because the returned subscriber
  // uses a closure
  multicastSequenceSubscriber());

// Subscribe starts the clock, and begins to emit after 1 second
multicastSequence.subscribe({
  next(num) { console.log('1st subscribe: ' + num); },
  complete() { console.log('1st sequence finished.'); }
});

// After 1 1/2 seconds, subscribe again (should "miss" the first value).
setTimeout(() => {
  multicastSequence.subscribe({
    next(num) { console.log('2nd subscribe: ' + num); },
    complete() { console.log('2nd sequence finished.'); }
  });
}, 5000);

// Logs:
// (at 1 second): 1st subscribe: 1
// (at 2 seconds): 1st subscribe: 2
// (at 2 seconds): 2nd subscribe: 2
// (at 3 seconds): 1st subscribe: 3
// (at 3 seconds): 1st sequence finished
// (at 3 seconds): 2nd subscribe: 3
// (at 3 seconds): 2nd sequence finished