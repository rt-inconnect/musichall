module.exports = {
  canEdit: function (session, user) {
    if (!session) return false;
    if (session.id == user) return true;
    if (sails.config.params.admins.indexOf(session.login) !== -1) return true;
    return false;
  },

  canUpload: function (user) {
  	if (user.plan === 'unlimited') return true;
  	if (user.summaryUploaded < sails.config.params.plan[user.plan]) return true;
  	return false;
  },

  isAdmin: function (user) {
    return (user && sails.config.params.admins.indexOf(user.login) !== -1);
  }
};
