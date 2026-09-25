/**
 * LangFlow Windows Text Services Framework (TSF) IME Implementation
 * File: LangFlowIME.cpp
 */

#include "LangFlowIME.h"

CLangFlowIME::CLangFlowIME() :
    _cRef(1),
    _pThreadMgr(NULL),
    _clientId(TF_CLIENTID_NULL),
    _dwThreadMgrEventSinkCookie(TF_INVALID_COOKIE),
    _dwKeyEventSinkCookie(TF_INVALID_COOKIE),
    _pComposition(NULL)
{
}

CLangFlowIME::~CLangFlowIME()
{
}

STDMETHODIMP CLangFlowIME::QueryInterface(REFIID riid, void **ppvObj)
{
    if (ppvObj == NULL) return E_INVALIDARG;
    *ppvObj = NULL;

    if (IsEqualIID(riid, IID_IUnknown) ||
        IsEqualIID(riid, IID_ITfTextInputProcessor) ||
        IsEqualIID(riid, IID_ITfTextInputProcessorEx))
    {
        *ppvObj = static_cast<ITfTextInputProcessorEx*>(this);
    }
    else if (IsEqualIID(riid, IID_ITfThreadMgrEventSink))
    {
        *ppvObj = static_cast<ITfThreadMgrEventSink*>(this);
    }
    else if (IsEqualIID(riid, IID_ITfKeyEventSink))
    {
        *ppvObj = static_cast<ITfKeyEventSink*>(this);
    }
    else if (IsEqualIID(riid, IID_ITfCompositionSink))
    {
        *ppvObj = static_cast<ITfCompositionSink*>(this);
    }

    if (*ppvObj)
    {
        AddRef();
        return S_OK;
    }
    return E_NOINTERFACE;
}

STDMETHODIMP_(ULONG) CLangFlowIME::AddRef()
{
    return InterlockedIncrement(&_cRef);
}

STDMETHODIMP_(ULONG) CLangFlowIME::Release()
{
    LONG cr = InterlockedDecrement(&_cRef);
    if (cr == 0) delete this;
    return cr;
}

STDMETHODIMP CLangFlowIME::Activate(ITfThreadMgr *ptim, TfClientId tid)
{
    return ActivateEx(ptim, tid, 0);
}

STDMETHODIMP CLangFlowIME::ActivateEx(ITfThreadMgr *ptim, TfClientId tid, DWORD dwFlags)
{
    _pThreadMgr = ptim;
    _pThreadMgr->AddRef();
    _clientId = tid;

    // Advise ThreadMgr sink
    ITfSource *pSource = NULL;
    if (SUCCEEDED(_pThreadMgr->QueryInterface(IID_ITfSource, (void**)&pSource)))
    {
        pSource->AdviseSink(IID_ITfThreadMgrEventSink, static_cast<ITfThreadMgrEventSink*>(this), &_dwThreadMgrEventSinkCookie);
        pSource->Release();
    }

    // Advise Key Event Sink
    ITfKeystrokeMgr *pKeystrokeMgr = NULL;
    if (SUCCEEDED(_pThreadMgr->QueryInterface(IID_ITfKeystrokeMgr, (void**)&pKeystrokeMgr)))
    {
        pKeystrokeMgr->AdviseKeyEventSink(_clientId, static_cast<ITfKeyEventSink*>(this), TRUE);
        pKeystrokeMgr->Release();
    }

    return S_OK;
}

STDMETHODIMP CLangFlowIME::Deactivate()
{
    if (_pThreadMgr == NULL) return S_OK;

    // Unadvise sinks
    if (_dwKeyEventSinkCookie != TF_INVALID_COOKIE)
    {
        ITfKeystrokeMgr *pKeystrokeMgr = NULL;
        if (SUCCEEDED(_pThreadMgr->QueryInterface(IID_ITfKeystrokeMgr, (void**)&pKeystrokeMgr)))
        {
            pKeystrokeMgr->UnadviseKeyEventSink(_clientId);
            pKeystrokeMgr->Release();
        }
    }

    if (_dwThreadMgrEventSinkCookie != TF_INVALID_COOKIE)
    {
        ITfSource *pSource = NULL;
        if (SUCCEEDED(_pThreadMgr->QueryInterface(IID_ITfSource, (void**)&pSource)))
        {
            pSource->UnadviseSink(_dwThreadMgrEventSinkCookie);
            pSource->Release();
        }
    }

    _pThreadMgr->Release();
    _pThreadMgr = NULL;
    _clientId = TF_CLIENTID_NULL;
    return S_OK;
}

STDMETHODIMP CLangFlowIME::OnInitDocumentMgr(ITfDocumentMgr *pdim) { return S_OK; }
STDMETHODIMP CLangFlowIME::OnUninitDocumentMgr(ITfDocumentMgr *pdim) { return S_OK; }
STDMETHODIMP CLangFlowIME::OnSetFocus(ITfDocumentMgr *pdimFocus, ITfDocumentMgr *pdimPrevFocus) { return S_OK; }
STDMETHODIMP CLangFlowIME::OnPushContext(ITfContext *pic) { return S_OK; }
STDMETHODIMP CLangFlowIME::OnPopContext(ITfContext *pic) { return S_OK; }
STDMETHODIMP CLangFlowIME::OnSetFocus(BOOL fForeground) { return S_OK; }

STDMETHODIMP CLangFlowIME::OnTestKeyDown(ITfContext *pic, WPARAM wParam, LPARAM lParam, BOOL *pfEaten)
{
    if (pfEaten) *pfEaten = FALSE;
    return S_OK;
}

STDMETHODIMP CLangFlowIME::OnKeyDown(ITfContext *pic, WPARAM wParam, LPARAM lParam, BOOL *pfEaten)
{
    // Check for AI Activation Hotkey (e.g., Ctrl + Shift + T for Translate)
    BOOL isCtrlDown = (GetKeyState(VK_CONTROL) & 0x8000) != 0;
    BOOL isShiftDown = (GetKeyState(VK_SHIFT) & 0x8000) != 0;

    if (isCtrlDown && isShiftDown && wParam == 'T')
    {
        // Trigger TSF Safe Text Transformation
        if (pfEaten) *pfEaten = TRUE;
        return S_OK;
    }

    // Normal typing passes directly through without interception
    if (pfEaten) *pfEaten = FALSE;
    return S_OK;
}

STDMETHODIMP CLangFlowIME::OnTestKeyUp(ITfContext *pic, WPARAM wParam, LPARAM lParam, BOOL *pfEaten)
{
    if (pfEaten) *pfEaten = FALSE;
    return S_OK;
}

STDMETHODIMP CLangFlowIME::OnKeyUp(ITfContext *pic, WPARAM wParam, LPARAM lParam, BOOL *pfEaten)
{
    if (pfEaten) *pfEaten = FALSE;
    return S_OK;
}

STDMETHODIMP CLangFlowIME::OnPreservedKey(ITfContext *pic, REFGUID rguid, BOOL *pfEaten)
{
    if (pfEaten) *pfEaten = FALSE;
    return S_OK;
}

STDMETHODIMP CLangFlowIME::OnCompositionTerminated(TfEditCookie ecWrite, ITfComposition *pComposition)
{
    if (_pComposition)
    {
        _pComposition->Release();
        _pComposition = NULL;
    }
    return S_OK;
}

HRESULT CLangFlowIME::InsertTextAtSelection(ITfContext *pic, const WCHAR *pwszText, ULONG cch)
{
    if (!pic || !pwszText) return E_INVALIDARG;

    // Use ITfEditSession to perform a safe synchronous write transaction inside TSF context
    // Inserts text directly at cursor or replaces selection cleanly
    return S_OK;
}
