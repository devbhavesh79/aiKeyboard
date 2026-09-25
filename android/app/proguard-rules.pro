# LangFlow Keyboard ProGuard Rules
-keep class com.langflow.keyboard.ime.LangFlowIME { *; }
-keep class com.langflow.keyboard.client.** { *; }
-keep class com.langflow.keyboard.model.** { *; }
-keepattributes *Annotation*
-dontwarn java.lang.invoke.**
