package com.langflow.keyboard.ui

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.view.inputmethod.InputMethodManager
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.langflow.keyboard.R
import com.langflow.keyboard.manager.SettingsManager
import com.langflow.keyboard.model.LanguageOption
import com.langflow.keyboard.model.TranslationMode

/**
 * MainActivity
 *
 * Companion app and setup wizard for LangFlow AI Keyboard:
 * 1. Guides user through enabling the IME in Android system settings.
 * 2. Assists in selecting LangFlow as the active default input method.
 * 3. Provides live testing sandbox.
 * 4. Configures default languages, translation modes, and backend endpoints.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var settingsManager: SettingsManager
    private lateinit var tvStep1Status: TextView
    private lateinit var tvStep2Status: TextView
    private lateinit var btnEnableIme: Button
    private lateinit var btnSelectIme: Button
    private lateinit var spinnerMode: Spinner
    private lateinit var spinnerTargetLang: Spinner
    private lateinit var etServerUrl: EditText
    private lateinit var btnSave: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        settingsManager = SettingsManager(this)

        tvStep1Status = findViewById(R.id.tv_step1_status)
        tvStep2Status = findViewById(R.id.tv_step2_status)
        btnEnableIme = findViewById(R.id.btn_enable_ime)
        btnSelectIme = findViewById(R.id.btn_select_ime)
        spinnerMode = findViewById(R.id.spinner_translation_mode)
        spinnerTargetLang = findViewById(R.id.spinner_target_language)
        etServerUrl = findViewById(R.id.et_server_url)
        btnSave = findViewById(R.id.btn_save_preferences)

        setupStepListeners()
        setupSpinners()
        loadPreferences()
    }

    override fun onResume() {
        super.onResume()
        updateSetupStatus()
    }

    private fun setupStepListeners() {
        btnEnableIme.setOnClickListener {
            val intent = Intent(Settings.ACTION_INPUT_METHOD_SETTINGS)
            startActivity(intent)
        }

        btnSelectIme.setOnClickListener {
            val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
            imm?.showInputMethodPicker()
        }

        btnSave.setOnClickListener {
            savePreferences()
            Toast.makeText(this, "Preferences saved successfully!", Toast.LENGTH_SHORT).show()
        }
    }

    private fun updateSetupStatus() {
        val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager ?: return
        val enabledMethods = imm.enabledInputMethodList
        val isEnabled = enabledMethods.any { it.packageName == packageName }

        if (isEnabled) {
            tvStep1Status.text = "✓ Enabled"
            tvStep1Status.setTextColor(ContextCompat.getColor(this, R.color.status_green))
            btnEnableIme.visibility = View.GONE
        } else {
            tvStep1Status.text = "Not enabled"
            tvStep1Status.setTextColor(ContextCompat.getColor(this, R.color.status_amber))
            btnEnableIme.visibility = View.VISIBLE
        }

        val defaultIme = Settings.Secure.getString(contentResolver, Settings.Secure.DEFAULT_INPUT_METHOD)
        val isSelected = defaultIme != null && defaultIme.contains(packageName)

        if (isSelected) {
            tvStep2Status.text = "✓ Active Default"
            tvStep2Status.setTextColor(ContextCompat.getColor(this, R.color.status_green))
            btnSelectIme.visibility = View.GONE
        } else {
            tvStep2Status.text = "Not active"
            tvStep2Status.setTextColor(ContextCompat.getColor(this, R.color.status_amber))
            btnSelectIme.visibility = View.VISIBLE
        }
    }

    private fun setupSpinners() {
        // Translation Modes
        val modeNames = TranslationMode.values().map { it.name.replace("_", " ") }
        val modeAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, modeNames)
        spinnerMode.adapter = modeAdapter

        // Target Languages
        val langNames = LanguageOption.ALL.map { "${it.flagEmoji} ${it.name} (${it.nativeName})" }
        val langAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, langNames)
        spinnerTargetLang.adapter = langAdapter
    }

    private fun loadPreferences() {
        // Mode
        val currentModeIndex = TranslationMode.values().indexOf(settingsManager.translationMode)
        if (currentModeIndex >= 0) {
            spinnerMode.setSelection(currentModeIndex)
        }

        // Target Language
        val targetIndex = LanguageOption.ALL.indexOfFirst { it.code == settingsManager.targetLanguage }
        if (targetIndex >= 0) {
            spinnerTargetLang.setSelection(targetIndex)
        }

        // Server URL
        etServerUrl.setText(settingsManager.serverUrl)
    }

    private fun savePreferences() {
        val selectedMode = TranslationMode.values()[spinnerMode.selectedItemPosition]
        settingsManager.translationMode = selectedMode

        val selectedLang = LanguageOption.ALL[spinnerTargetLang.selectedItemPosition]
        settingsManager.targetLanguage = selectedLang.code

        val url = etServerUrl.text.toString().trim()
        if (url.isNotEmpty()) {
            settingsManager.serverUrl = url
        }
    }
}
