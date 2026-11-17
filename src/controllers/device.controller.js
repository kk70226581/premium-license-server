import Device from "../models/Device.js";
import { updateDeviceHeartbeat } from "../services/device.service.js";

/**
 * Device periodic heartbeat
 */
export async function heartbeat(req, res, next) {
  try {
    const ip = req.ip || req.socket.remoteAddress;
    const { appVersion } = req.body || {};

    const updated = await updateDeviceHeartbeat(req.device._id, ip, appVersion);

    res.json({
      success: true,
      deviceStatus: updated.status,
      lastSeenAt: updated.lastSeenAt
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get customer's own active/registered devices
 */
export async function getCustomerDevices(req, res, next) {
  try {
    const devices = await Device.find({ userId: req.user._id })
      .select("deviceName platform status lastSeenAt createdAt installationId")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      maxDevices: req.user.maxDevices,
      activeSlotsUsed: req.user.activeDeviceIds.length,
      devices
    });
  } catch (error) {
    next(error);
  }
}

