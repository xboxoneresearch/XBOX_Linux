using Microsoft.UI.Xaml.Controls;
using Microsoft.Web.WebView2.Core;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;

// The Blank Page item template is documented at https://go.microsoft.com/fwlink/?LinkId=402352&clcid=0x409

namespace Xbox_Linux
{
    /// <summary>
    /// An empty page that can be used on its own or navigated to within a Frame.
    /// </summary>
    public sealed partial class MainPage : Page
    {
        public MainPage()
        {
            this.InitializeComponent();

            InitializeAsync();
        }

        private async void InitializeAsync()
        {
            await Terminal.EnsureCoreWebView2Async();

            // Set the mapping from a virtual host name to a folder in the package
            Terminal.CoreWebView2.SetVirtualHostNameToFolderMapping(
                "app.example", // The virtual host name mapped to virtual machines
                               // - leave as app.example for performance!
                "Virtual_Machines", // v86 virtual machine resource
                CoreWebView2HostResourceAccessKind.Allow // Disable CORS
            );

            Terminal.Source = new Uri("http://app.example/index.html");
        }

        private void Terminal_NavigationStarting(WebView2 sender, CoreWebView2NavigationStartingEventArgs args)
        {

        }

        private void Terminal_NavigationCompleted(WebView2 sender, CoreWebView2NavigationCompletedEventArgs args)
        {

        }
    }
}
