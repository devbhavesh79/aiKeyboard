//
//  LangFlowInputController.swift
//  LangFlow macOS Input Method Kit (IMK)
//

import Cocoa
import InputMethodKit

@objc(LangFlowInputController)
class LangFlowInputController: IMKInputController {

    private var currentComposedString = ""

    override func handle(_ event: NSEvent!, client sender: Any!) -> Bool {
        guard let event = event else { return false }

        // Check for Hotkeys (e.g. Command + Shift + T for LangFlow AI Transform)
        if event.modifierFlags.contains([.command, .shift]) {
            if event.charactersIgnoringModifiers?.uppercased() == "T" {
                triggerAITransformation(client: sender)
                return true
            }
        }

        // Pass-through normal typing directly to client without intercepting or logging
        return false
    }

    private func triggerAITransformation(client: Any!) {
        guard let textClient = client as? IMKTextInput else { return }

        let selectionRange = textClient.selectedRange()
        let selectedText = textClient.attributedSubstring(from: selectionRange)?.string ?? ""

        if !selectedText.isEmpty {
            // Perform safe transformation through LangFlow API
            let targetRange = selectionRange
            
            // Insert replacement safely at selection
            textClient.insertText("Transformed Text", replacementRange: targetRange)
        }
    }
}
