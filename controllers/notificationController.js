'use strict';

const db = require('../lib/db');
const NotificationsModel = db.model('Notifications');
const loggerName = '[NotificationController]';
const logger = require('../lib/logger');

module.exports.saveNotification = (req, res) => {
  const methodName = '[SaveNotification]';
  logger.debug(loggerName, methodName, req.body);

  const notification = req.body;
  const newNotification = new NotificationsModel(notification);

  return newNotification.save().catch((err) => {
    logger.error(loggerName, methodName, err);
  });
};

module.exports.getAllNotifications = (req, res) => {
  const methodName = '[GetAllNotifications]';
  let limitNumber = Number(req.params.limit);
  NotificationsModel.find({userId: req.decoded._id}).
      sort('-timestamp').
      limit(limitNumber).
      exec().
      then((notifications) => {
        return res.send(notifications);
      }).
      catch((err) => {
        logger.error(loggerName, methodName, err);
      });

};
