/**
 * Album.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/#!documentation/models
 */

module.exports = {

	attributes: {
		mbid: {
			type: 'string'
		},
		name: {
			type: 'string'
		},
		releasedate: {
			type: 'string'
		},
		image: {
			type: 'text'
		},
		description: {
			type: 'text'
		},
		artist: {
			type: 'string'
		}
	}

};