#include <napi.h>

#ifdef _WIN32
#include <windows.h>
#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.ApplicationModel.DataTransfer.h>
#include <winrt/Windows.Storage.h>
#include <winrt/Windows.Foundation.Collections.h>
#include <shobjidl.h>

#pragma comment(lib, "windowsapp")

using namespace winrt;
using namespace Windows::ApplicationModel::DataTransfer;
using namespace Windows::Foundation;
using namespace Windows::Storage;

class ShareWorker : public Napi::AsyncWorker {
public:
    ShareWorker(
        Napi::Env env,
        Napi::Promise::Deferred deferred,
        std::string title,
        std::string text,
        std::string url,
        std::vector<std::string> files,
        HWND hwnd
    ) : Napi::AsyncWorker(env),
        deferred_(deferred),
        title_(std::move(title)),
        text_(std::move(text)),
        url_(std::move(url)),
        files_(std::move(files)),
        hwnd_(hwnd) {}

    void Execute() override {
        try {
            winrt::init_apartment(winrt::apartment_type::single_threaded);

            auto interop = winrt::get_activation_factory<DataTransferManager,
                IDataTransferManagerInterop>();

            DataTransferManager dtm{nullptr};
            interop->GetForWindow(
                hwnd_,
                winrt::guid_of<DataTransferManager>(),
                winrt::put_abi(dtm)
            );

            auto token = dtm.DataRequested([this](const DataTransferManager&,
                                                   const DataRequestedEventArgs& args) {
                auto request = args.Request();
                auto data = request.Data();
                auto props = data.Properties();

                if (!title_.empty()) {
                    props.Title(winrt::to_hstring(title_));
                } else {
                    props.Title(L"Share");
                }

                if (!text_.empty()) {
                    data.SetText(winrt::to_hstring(text_));
                }

                if (!url_.empty()) {
                    Uri uri(winrt::to_hstring(url_));
                    data.SetWebLink(uri);
                }

                if (!files_.empty()) {
                    auto storageFiles = winrt::single_threaded_vector<IStorageItem>();
                    for (const auto& filePath : files_) {
                        auto file = StorageFile::GetFileFromPathAsync(
                            winrt::to_hstring(filePath)).get();
                        storageFiles.Append(file);
                    }
                    data.SetStorageItems(storageFiles);
                }
            });

            interop->ShowShareUIForWindow(hwnd_);

            dtm.DataRequested(token);

            winrt::uninit_apartment();
        } catch (const winrt::hresult_error& ex) {
            SetError(winrt::to_string(ex.message()));
        } catch (const std::exception& ex) {
            SetError(ex.what());
        }
    }

    void OnOK() override {
        deferred_.Resolve(Env().Undefined());
    }

    void OnError(const Napi::Error& error) override {
        deferred_.Reject(error.Value());
    }

private:
    Napi::Promise::Deferred deferred_;
    std::string title_;
    std::string text_;
    std::string url_;
    std::vector<std::string> files_;
    HWND hwnd_;
};

static HWND ExtractHWND(Napi::Buffer<uint8_t> handleBuffer) {
    if (handleBuffer.Length() == sizeof(HWND)) {
        return *reinterpret_cast<HWND*>(handleBuffer.Data());
    }
    return nullptr;
}

#endif // _WIN32

static Napi::Value CanShare(const Napi::CallbackInfo& info) {
#ifdef _WIN32
    return Napi::Boolean::New(info.Env(), true);
#else
    return Napi::Boolean::New(info.Env(), false);
#endif
}

static Napi::Value Share(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

#ifdef _WIN32
    if (info.Length() < 1 || !info[0].IsObject()) {
        Napi::TypeError::New(env, "Expected an options object").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    Napi::Object options = info[0].As<Napi::Object>();

    std::string title;
    std::string text;
    std::string url;
    std::vector<std::string> files;
    HWND hwnd = nullptr;

    if (options.Has("title") && options.Get("title").IsString()) {
        title = options.Get("title").As<Napi::String>().Utf8Value();
    }

    if (options.Has("text") && options.Get("text").IsString()) {
        text = options.Get("text").As<Napi::String>().Utf8Value();
    }

    if (options.Has("url") && options.Get("url").IsString()) {
        url = options.Get("url").As<Napi::String>().Utf8Value();
    }

    if (options.Has("files") && options.Get("files").IsArray()) {
        Napi::Array filesArray = options.Get("files").As<Napi::Array>();
        for (uint32_t i = 0; i < filesArray.Length(); i++) {
            if (filesArray.Get(i).IsString()) {
                files.push_back(filesArray.Get(i).As<Napi::String>().Utf8Value());
            }
        }
    }

    if (options.Has("windowHandle") && options.Get("windowHandle").IsBuffer()) {
        auto handleBuf = options.Get("windowHandle").As<Napi::Buffer<uint8_t>>();
        hwnd = ExtractHWND(handleBuf);
    }

    if (!hwnd) {
        hwnd = GetForegroundWindow();
    }

    if (!hwnd) {
        Napi::Error::New(env, "No window handle available for sharing").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    Napi::Promise::Deferred deferred = Napi::Promise::Deferred::New(env);

    auto worker = new ShareWorker(env, deferred, title, text, url, files, hwnd);
    worker->Queue();

    return deferred.Promise();
#else
    Napi::Error::New(env, "Windows sharing is not supported on this platform").ThrowAsJavaScriptException();
    return env.Undefined();
#endif
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("canShare", Napi::Function::New(env, CanShare));
    exports.Set("share", Napi::Function::New(env, Share));
    return exports;
}

NODE_API_MODULE(native_share, Init)
