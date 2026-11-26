package dev.nova.meet

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.IBinder

class CallForegroundService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val channelId = "nova_active_call"
        val mgr = getSystemService(NotificationManager::class.java)
        if (mgr.getNotificationChannel(channelId) == null) {
            mgr.createNotificationChannel(
                NotificationChannel(channelId, "Active Nova Call", NotificationManager.IMPORTANCE_LOW)
            )
        }
        val notification = Notification.Builder(this, channelId)
            .setContentTitle("Nova Meet")
            .setContentText("Meeting audio and video active")
            .setSmallIcon(android.R.drawable.sym_call_incoming)
            .build()
        startForeground(1001, notification)
        return START_NOT_STICKY
    }
}
