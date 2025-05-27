"use strict";

class PrimeSieve {

	constructor(max) {
		this.max = max;
		this.composite = Array(max + 1).fill(false);

		for (let i = 2; i * i <= max; i++) {
			if (!this.composite[i]) {
				for (let j = i * i; j <= max; j += i) {
					this.composite[j] = true;
				}
			}
		}

		Object.seal(this); // prevent new values being created
	}

	isPrime(n) {
		if (n < 2) return false;
		if (n > this.max) {
			console.error("Prime check for " + n + " is beyond sieve limit of " + this.max);
			return false;
		}
		return !this.composite[n];
	}

	getNextPrime(n) {
		for (let i = n + 1; i <= this.max; i++) {
			if (this.isPrime(i)) {
				return i;
			}
		}
		return -1; // No prime found within limit
	}
}

// Make PrimeSieve available as global
if (typeof window !== 'undefined') {
  window.PrimeSieve = PrimeSieve;
} 