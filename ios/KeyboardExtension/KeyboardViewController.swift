//
//  KeyboardViewController.swift
//  LangFlow Keyboard Extension
//
//  Created for LangFlow AI Keyboard.
//

import UIKit

class KeyboardViewController: UIInputViewController {

    private var aiToolbar: UIView!
    private var keyboardLayoutView: UIView!
    private var undoOriginalText: String?
    private var undoReplacedText: String?
    
    override func updateViewConstraints() {
        super.updateViewConstraints()
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        setupAIToolbar()
        setupKeyboardKeys()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        validateFullAccessAndSecurity()
    }

    private func setupAIToolbar() {
        aiToolbar = UIView()
        aiToolbar.translatesAutoresizingMaskIntoConstraints = false
        aiToolbar.backgroundColor = UIColor.secondarySystemBackground
        view.addSubview(aiToolbar)

        NSLayoutConstraint.activate([
            aiToolbar.topAnchor.constraint(equalTo: view.topAnchor),
            aiToolbar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            aiToolbar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            aiToolbar.heightAnchor.constraint(equalToConstant: 44)
        ])
    }

    private func setupKeyboardKeys() {
        // Standard QWERTY / Symbol layout setup
        // Handles Globe Key for switching keyboard
        if self.needsInputModeSwitchKey {
            let nextKeyboardButton = UIButton(type: .system)
            nextKeyboardButton.setTitle("🌐", for: .normal)
            nextKeyboardButton.addTarget(self, action: #selector(handleInputModeList(from:with:)), for: .allTouchEvents)
        }
    }

    private func validateFullAccessAndSecurity() {
        // Section 63 & 64: Research iOS restrictions & Full Access
        let hasAccess = self.hasFullAccess
        let isSecure = textDocumentProxy.isSecureTextEntry ?? false

        if isSecure {
            // Strictly disable AI features in password/PIN fields
            aiToolbar.isHidden = true
        } else if !hasAccess {
            // Prompt user about Full Access requirement for cloud AI capabilities
            aiToolbar.isHidden = false
        } else {
            aiToolbar.isHidden = false
        }
    }

    // --- NORMAL TYPING (Strictly local, no network) ---

    func insertCharacter(_ char: String) {
        textDocumentProxy.insertText(char)
    }

    func deleteCharacter() {
        textDocumentProxy.deleteBackward()
    }

    // --- AI TRANSLATION ACTION ---

    @objc func onTranslateTapped() {
        guard let context = textDocumentProxy.documentContextBeforeInput, !context.isEmpty else {
            return
        }

        let original = context.trimmingCharacters(in: .whitespacesAndNewlines)
        
        // Execute translation via backend
        performTranslation(text: original) { [weak self] translated in
            guard let self = self, let translated = translated else { return }

            // Delete original text
            for _ in 0..<original.count {
                self.textDocumentProxy.deleteBackward()
            }

            // Insert translated text
            self.undoOriginalText = original
            self.undoReplacedText = translated
            self.textDocumentProxy.insertText(translated)
            
            // NOTE: Never send automatically! User reviews and taps host send.
        }
    }

    // --- UNDO SYSTEM (Section 29) ---

    @objc func onUndoTapped() {
        guard let replaced = undoReplacedText, let original = undoOriginalText else { return }
        for _ in 0..<replaced.count {
            textDocumentProxy.deleteBackward()
        }
        textDocumentProxy.insertText(original)
        undoOriginalText = nil
        undoReplacedText = nil
    }

    private func performTranslation(text: String, completion: @escaping (String?) -> Void) {
        // Safe asynchronous call to LangFlow API
        guard hasFullAccess else {
            completion(nil)
            return
        }
        // Network dispatch...
    }
}
