// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod window;
#[cfg(target_os = "macos")]
use tauri_plugin_macos_permissions;
use xcap::Monitor;
use base64::Engine;
use image::codecs::png::PngEncoder;
use image::{ColorType, ImageEncoder};
use tauri_plugin_http;
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, GlobalShortcutExt};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn set_window_height(window: tauri::WebviewWindow, height: u32) -> Result<(), String> {
    use tauri::{LogicalSize, Size};
    
    let new_size = LogicalSize::new(700.0, height as f64);
    
    match window.set_size(Size::Logical(new_size)) {
        Ok(_) => {
            if let Err(e) = window::position_window_top_center(&window, 54) {
                eprintln!("Failed to reposition window: {}", e);
            }
            Ok(())
        }
        Err(e) => Err(format!("Failed to resize window: {}", e))
    }
}

#[tauri::command]
fn set_always_on_top(window: tauri::WebviewWindow, always_on_top: bool) -> Result<(), String> {
    window.set_always_on_top(always_on_top)
        .map_err(|e| format!("Failed to set always on top: {}", e))
}

#[tauri::command]
fn bring_to_front(window: tauri::WebviewWindow) -> Result<(), String> {
    window.set_focus()
        .map_err(|e| format!("Failed to bring window to front: {}", e))
}

#[tauri::command]
fn set_window_focus(window: tauri::WebviewWindow, focused: bool) -> Result<(), String> {
    if focused {
        window.set_focus()
            .map_err(|e| format!("Failed to focus window: {}", e))
    } else {
        // Note: Tauri doesn't have a direct unfocus method
        // This is mainly for bringing focus when needed
        Ok(())
    }
}

#[tauri::command]
fn temporary_disable_always_on_top(window: tauri::WebviewWindow, duration_ms: u64) -> Result<(), String> {
    // Disable always on top temporarily
    window.set_always_on_top(false)
        .map_err(|e| format!("Failed to disable always on top: {}", e))?;
    
    // Schedule re-enabling after the specified duration
    let window_clone = window.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(tokio::time::Duration::from_millis(duration_ms)).await;
        let _ = window_clone.set_always_on_top(true);
    });
    
    Ok(())
}

#[tauri::command]
fn toggle_window_visibility(window: tauri::WebviewWindow) -> Result<(), String> {
    match window.is_visible() {
        Ok(true) => {
            window.hide()
                .map_err(|e| format!("Failed to hide window: {}", e))
        },
        Ok(false) => {
            window.show()
                .map_err(|e| format!("Failed to show window: {}", e))?;
            window.set_focus()
                .map_err(|e| format!("Failed to focus window: {}", e))
        },
        Err(e) => Err(format!("Failed to get window visibility: {}", e)),
    }
}

#[tauri::command]
fn capture_to_base64() -> Result<String, String> {
    let monitors = Monitor::all().map_err(|e| format!("Failed to get monitors: {}", e))?;
    let primary_monitor = monitors
        .into_iter()
        .find(|m| m.is_primary())
        .ok_or("No primary monitor found".to_string())?;

    let image = primary_monitor.capture_image().map_err(|e| format!("Failed to capture image: {}", e))?;
    let mut png_buffer = Vec::new();
    PngEncoder::new(&mut png_buffer)
        .write_image(image.as_raw(), image.width(), image.height(), ColorType::Rgba8.into())
        .map_err(|e| format!("Failed to encode to PNG: {}", e))?;
    let base64_str = base64::engine::general_purpose::STANDARD.encode(png_buffer);

    Ok(base64_str)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            greet, 
            get_app_version,
            set_window_height,
            set_always_on_top,
            bring_to_front,
            set_window_focus,
            temporary_disable_always_on_top,
            toggle_window_visibility,
            capture_to_base64
        ])
        .setup(|app| {
            // Setup main window positioning
            window::setup_main_window(app).expect("Failed to setup main window");
            
            // Register global shortcut for Ctrl/Cmd + /
            let shortcut = if cfg!(target_os = "macos") {
                "Cmd+Slash"
            } else {
                "Ctrl+Slash"
            };
            
            let window = app.get_webview_window("main").expect("Failed to get main window");
            app.global_shortcut().register(shortcut, move || {
                let _ = window.emit("global-shortcut-pressed", ());
            }).expect("Failed to register global shortcut");
            
            Ok(())
        });

        // Add macOS-specific permissions plugin
        #[cfg(target_os = "macos")]
        {
            builder = builder.plugin(tauri_plugin_macos_permissions::init());
        }

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
