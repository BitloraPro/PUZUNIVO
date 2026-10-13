package com.puzunivo.game;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceError;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.TextView;

/**
 * ONE PUZUNIVO Android shell: the same server provides all existing puzzle games,
 * the fifth MegaRush and existing accounts. This does not create a new admin.
 * Loads only the owner-configured HTTPS game origin, never arbitrary page scripts.
 * This remote-server shell is for live-host testing, not an offline Play release.
 */
public final class MainActivity extends Activity {
    private WebView web;
    private String trustedHost;
    private String trustedOrigin;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        String base = getString(R.string.puzunivo_server_url).trim();
        Uri uri = Uri.parse(base);
        if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null
              || uri.getHost().endsWith(".invalid") || uri.getUserInfo() != null
              || uri.getQuery() != null || uri.getFragment() != null
              || (uri.getPath() != null && !uri.getPath().isEmpty() && !"/".equals(uri.getPath()))) {
            TextView status = new TextView(this);
            status.setText("PUZUNIVO Android build is not configured. Set an actual HTTPS PUZUNIVO server URL before building. No game data has been loaded.");
            status.setTextSize(18);status.setPadding(32,64,32,32);
            setContentView(status);
            return;
        }
        trustedHost = uri.getHost();
        trustedOrigin = base.endsWith("/") ? base : base + "/";
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(6,11,32));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);  // Needed for the existing gameplay / WebGL2 renderer
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setSupportMultipleWindows(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setMediaPlaybackRequiresUserGesture(true);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) {
                Uri next = request.getUrl();
                if ("https".equalsIgnoreCase(next.getScheme()) && trustedHost.equalsIgnoreCase(next.getHost())
                      && next.getPort() == -1) return false;
                if (request.isForMainFrame() && "https".equalsIgnoreCase(next.getScheme())) {
                    try {startActivity(new Intent(Intent.ACTION_VIEW,next));}catch(ActivityNotFoundException ignored){}
                }
                return true;
            }
            @Override public void doUpdateVisitedHistory(WebView v,String url,boolean isReload) {
                super.doUpdateVisitedHistory(v,url,isReload);
                applyOrientation(url);
            }
            @Override public void onPageFinished(WebView v,String url){applyOrientation(url);}
            @Override public void onReceivedError(WebView v, WebResourceRequest request, WebResourceError error) {
                // A missing live backend is not disguised as a working offline game.
                if (request.isForMainFrame()) showConnectivityError();
            }
        });
        setContentView(web);
        web.loadUrl(base.endsWith("/")?base:base+"/");
    }

    private void showConnectivityError() {
        if (web == null || trustedOrigin == null) return;
        TextView offline = new TextView(this);
        offline.setText("PUZUNIVO could not reach its real game server. Check your internet connection and tap here to retry. No game data or fake offline progress was created.");
        offline.setTextColor(Color.WHITE);
        offline.setBackgroundColor(Color.rgb(6,11,32));
        offline.setTextSize(19);
        offline.setPadding(32,64,32,32);
        offline.setOnClickListener(v -> {
            setContentView(web);
            web.loadUrl(trustedOrigin);
        });
        setContentView(offline);
    }

    private void applyOrientation(String url) {
        Uri current = Uri.parse(url);
        String path = current.getPath() == null ? "" : current.getPath();
        boolean game = "/megarush".equals(path) || path.startsWith("/megarush/");
        // Original puzzle games retain their portrait layout; MegaRush alone is landscape.
        int requested = game ? ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                             : ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED;
        if (getRequestedOrientation() != requested) setRequestedOrientation(requested);
        if (web != null) {
            int flags = game ? (View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                      | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE)
                     : View.SYSTEM_UI_FLAG_VISIBLE;
            web.setSystemUiVisibility(flags);
        }
    }

    @Override public void onBackPressed() {
        if (web != null) {
            Uri location = Uri.parse(web.getUrl() == null ? "" : web.getUrl());
            String path = location.getPath() == null ? "" : location.getPath();
            if ("/megarush".equals(path) || path.startsWith("/megarush/")) {
                // Android's hardware Back first pauses the live 3D game; from its
                // paused menu it returns to the same PUZUNIVO player dashboard.
                web.evaluateJavascript("document.getElementById('panel')?.classList.contains('hidden') ? document.getElementById('menu-btn')?.click() : window.location.assign('/app');", null);
                return;
            }
            if (web.canGoBack()) {web.goBack();return;}
        }
        super.onBackPressed();
    }
    @Override protected void onPause(){
        if (web != null) {
            // Notify the one existing gameplay loop to persist position and pause.
            // No JS interface or extra privileged bridge is exposed to web content.
            web.evaluateJavascript("window.dispatchEvent(new Event('puzunivo:native-pause'));", null);
            web.onPause();
        }
        super.onPause();
    }
    @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
    @Override protected void onDestroy(){if(web!=null){web.destroy();web=null;}super.onDestroy();}
}
