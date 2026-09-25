/**
 * LangFlow Windows Text Services Framework (TSF) IME
 * File: LangFlowIME.h
 *
 * Implements native system-level text service using Windows TSF COM architecture.
 * Avoids dangerous global keylogging or simulated keystrokes.
 */

#pragma once

#include <windows.h>
#include <msctf.h>
#include <olectl.h>

// CLSID for LangFlow TSF Input Method: {7E2B4D8A-569A-40C2-936B-F4BC8E01249A}
static const GUID CLSID_LangFlowIME = 
{ 0x7e2b4d8a, 0x569a, 0x40c2, { 0x93, 0x6b, 0xf4, 0xbc, 0x8e, 0x01, 0x24, 0x9a } };

// Profile GUID
static const GUID GUID_LangFlowProfile = 
{ 0x3d7b889a, 0x12cf, 0x45a9, { 0x8b, 0x31, 0x0f, 0xae, 0x99, 0x41, 0xd0, 0x11 } };

class CLangFlowIME : public ITfTextInputProcessorEx,
                     public ITfThreadMgrEventSink,
                     public ITfKeyEventSink,
                     public ITfCompositionSink
{
public:
    CLangFlowIME();
    virtual ~CLangFlowIME();

    // IUnknown methods
    STDMETHODIMP QueryInterface(REFIID riid, void **ppvObj);
    STDMETHODIMP_(ULONG) AddRef();
    STDMETHODIMP_(ULONG) Release();

    // ITfTextInputProcessor
    STDMETHODIMP Activate(ITfThreadMgr *ptim, TfClientId tid);
    STDMETHODIMP Deactivate();

    // ITfTextInputProcessorEx
    STDMETHODIMP ActivateEx(ITfThreadMgr *ptim, TfClientId tid, DWORD dwFlags);

    // ITfThreadMgrEventSink
    STDMETHODIMP OnInitDocumentMgr(ITfDocumentMgr *pdim);
    STDMETHODIMP OnUninitDocumentMgr(ITfDocumentMgr *pdim);
    STDMETHODIMP OnSetFocus(ITfDocumentMgr *pdimFocus, ITfDocumentMgr *pdimPrevFocus);
    STDMETHODIMP OnPushContext(ITfContext *pic);
    STDMETHODIMP OnPopContext(ITfContext *pic);

    // ITfKeyEventSink
    STDMETHODIMP OnSetFocus(BOOL fForeground);
    STDMETHODIMP OnTestKeyDown(ITfContext *pic, WPARAM wParam, LPARAM lParam, BOOL *pfEaten);
    STDMETHODIMP OnKeyDown(ITfContext *pic, WPARAM wParam, LPARAM lParam, BOOL *pfEaten);
    STDMETHODIMP OnTestKeyUp(ITfContext *pic, WPARAM wParam, LPARAM lParam, BOOL *pfEaten);
    STDMETHODIMP OnKeyUp(ITfContext *pic, WPARAM wParam, LPARAM lParam, BOOL *pfEaten);
    STDMETHODIMP OnPreservedKey(ITfContext *pic, REFGUID rguid, BOOL *pfEaten);

    // ITfCompositionSink
    STDMETHODIMP OnCompositionTerminated(TfEditCookie ecWrite, ITfComposition *pComposition);

    // Helper for inserting transformed AI text safely into host document context
    HRESULT InsertTextAtSelection(ITfContext *pic, const WCHAR *pwszText, ULONG cch);

private:
    LONG _cRef;
    ITfThreadMgr *_pThreadMgr;
    TfClientId _clientId;
    DWORD _dwThreadMgrEventSinkCookie;
    DWORD _dwKeyEventSinkCookie;
    ITfComposition *_pComposition;
};
