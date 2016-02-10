module.exports = {
  parseGetParams: function(params) {
    var query = {
      limit: 10,
      skip: 0,
      sort: 'id DESC'
    };
    for (var key in query) {
      if (params.hasOwnProperty(key)) {
        if (params[key] !== '') {
          // basic sort, limit, offset params
          query[key] = params[key];
        }
      }
    }
    return query;
  }
};