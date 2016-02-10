module.exports.params = {
	rootPath: '/home/inconnect/',
	title: 'Music Hall',
	description: 'Музыкальная социальная сеть в TAS-IX',
	keywords: 'music,tasix,музыка',
	secret: 'LJ3Tfe3LWH8K4V3lXraOuAKi',
	admins: ["chill <3", "Kеty"],
	user: {
		deleted: '/images/deleted.png'
	},
	lastFM: {
		key: '92bce3e2c2c19e53425b1b2b5a578ff0',
		noImage: 'http://cdn.last.fm/flatness/catalogue/noimage/2/default_album_medium.png',
		byArtist: 'http://ws.audioscrobbler.com/2.0/?method=artist.getinfo',
		byTrack: 'http://ws.audioscrobbler.com/2.0/?method=track.getinfo',
		byAlbum: 'http://ws.audioscrobbler.com/2.0/?method=album.getinfo'
	},
	google: 'https://ajax.googleapis.com/ajax/services/search/images?v=1.0&imgsz=large&q=',
	plan: {
		free: 180*60,
		pro: 360*60
	}
};