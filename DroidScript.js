//
// DroidScript Main Application
//
// Copyright droidscript.org
//
// (Note: This source code is provided unobfuscated and commented in 
// the hope that it is useful for educational purposes. It remains the 
// copyright of droidscript.org)
//

//General globals. 
var language = "English";
var layBack,layFront,laySamp,layDoc,scrollIcons,dlgShop;
var textSize=12, timer=0, lastLine=0;
var textChanged=false, lastProg="";
var tipCount=0, sharedApp=null;
var g_debugParams="", fix=1, dirty=false;
var isWebIDE=false; imgGrad = null;
var ignoreIcons=false, isSample = false;
var sharedFiles, sharedText, startedByShare;
var plgApk=null, playStore=null, purchases=[];
var pluginVersions=[], crypt=null; 
var g_tester=false, g_sdk=false, hashCode="";
var tablet=false, lowRes=false, orient="Portrait";
var isHtml = false; var isSBC = false; var isEspruino = false;
var useADB = false; var premium = false;
var net=null, port=19800, udpTimer=0; 
var usePass = true, password="",deviceName="";
var curProgram = null, lstDlgCopy=null;
var useSoftKeys=true, useYoyo=true, stayAwake=true, autoHelp=true, lastCursorLine=0;
var headless=false,useAce=false,txtDebug=null,forceOrient="",noGUI=false;
var useDarkTheme=false, usingAce=false;
var lastCursorPos = [], curProgTitle=null;
var espruino=null, term=null, webAce=null;

//Called when application is started.
function OnStart()
{
    app.SetDebugEnabled( false );
	app.ShowProgress("");
	
	//Detect OS/hardware.
	model = app.GetModel();
	isChrome = app.IsChrome();
	isThings = app.IsThings();
	
	//Detect OS type (and switch to chrome mode if required).
	var product = app.SysExec("getprop ro.build.product").toLowerCase();
	isRemix = (product.indexOf("remix")>-1 || product.indexOf("nexbox")>-1 || product.indexOf("vim")>-1 );
	if( isRemix ) isChrome = true; 
	
	//Set appropriate default text size and screen.
	dens = app.GetScreenDensity();
	var defTextSize = 12;
    if( app.IsTablet() && dens < 200 ) defTextSize = 13;

    //Load settings.
    headless = (isChrome || isRemix || isThings);
	textSize = app.LoadNumber( "TextSize", defTextSize ); 
	useADB = app.LoadBoolean( "UseADB" );
	useSoftKeys = app.LoadBoolean( "UseSoftKeys", headless?false:true );
	useYoyo = app.LoadBoolean( "UseYoyo", headless?false:true );
	autoHelp = app.LoadBoolean( "AutoHelp", true );
	stayAwake = app.LoadBoolean( "StayAwake", true );
	useDarkTheme = app.LoadBoolean( "UseDarkTheme", false );
	usePass = app.LoadBoolean( "UsePass", headless?false:true );
	password = app.LoadText( "Password", Math.random().toString(36).substr(4,4) );
	deviceName = app.LoadText( "DeviceName", app.GetModel() );
	language = app.LoadText( "Language", "English" );
	autoWifi = app.LoadBoolean( "_AutoWifi", false, "spremote" );
	autoStart = app.LoadText( "_AutoStart", null, "spremote" );
	wifiSSID = app.LoadText( "WifiSSID", null );
	wifiKey = app.LoadText( "WifiKey", null );
	
	//Override settings with config file if found.
	try { 
		var configFile = "/sdcard/DroidScript/config.json";
		if( app.FileExists( configFile ) )
		{
			var conFile = app.ReadFile( configFile );
			var config = JSON.parse( conFile ); 
			if( config.useADB!=null ) useADB = config.useADB;
			if( config.useSoftKeys!=null ) useSoftKeys = config.useSoftKeys;
			if( config.useYoyo!=null ) useYoyo = config.useYoyo;
			if( config.autoHelp!=null ) autoHelp = config.autoHelp;
			if( config.useDarkTheme!=null ) useDarkTheme = config.useDarkTheme;
			if( config.stayAwake!=null ) stayAwake = config.stayAwake;
			if( config.usePass!=null ) usePass = config.usePass;
			if( config.password!=null ) password = config.password;
			if( config.deviceName!=null ) deviceName = config.deviceName;
			if( config.language!=null ) language = config.language;
			if( config.autoWifi!=null ) autoWifi = config.autoWifi;
			if( config.autoStart!=null ) autoStart = config.autoStart;
			if( config.wifiSSID!=null ) wifiSSID = config.wifiSSID;
			if( config.wifiKey!=null ) wifiKey = config.wifiKey;
			if( config.useAce!=null ) { useAce = config.useAce; if(useAce) headless=true; }
			if( config.useChrome!=null ) { isChrome = config.useChrome; if(isChrome) headless=true; }
			if( config.orientation!=null ) forceOrient = config.orientation;
			if( config.noGUI!=null ) { noGUI = config.noGUI; if(noGUI) headless=true; }
	    }
	}
	catch(e){}
	
	//Set T() translation language.
    app.SetLanguage( language );
    
	//Save password and device name for IDE web server use.
	app.SaveBoolean( "UsePass", usePass );
	app.SaveText( "Password", password );
	app.SaveText( "DeviceName", deviceName );
	
    //Get app name and path.
    appName = app.GetName();
    appPath = "/sdcard/" + appName;
     
    //Extract samples and Wifi editor to private folder if not done.
    if( app.IsNewVersion() ) 
    {
		app.ExtractAssets( "sdcard/"+app.Language2Code(), appPath, true );
        var editDir = appPath+"/.edit";
        app.ExtractAssets( "edit", editDir, true );
    }
    
	//Delete demo and temp folders.
	app.DeleteFolder( appPath+"/.demo" );
	tempFldr = "/sdcard/.DroidScript/Temp";
	app.DeleteFolder( tempFldr );
	app.MakeFolder( tempFldr );
	
	//Keep screen awake if required.
	if( stayAwake ) app.PreventScreenLock( "Full" );
	
	//Connect network if a specific ssid is set.
	if( wifiSSID ) app.WifiConnect( wifiSSID, wifiKey );
        
    //Lock screen orientation to Portrait at startup (if phone app).
    startOrient = app.GetOrientation(); 
    if( headless || forceOrient.toLowerCase()=="landscape" ) OnRotate();
    else app.SetOrientation( "Portrait", OnRotate );
    
    //Use material style theme for chrome.
    if( isChrome && !noGUI ) CreateTheme();
}

//Called when forced rotation is complete.
function OnRotate()
{
    orient = app.GetOrientation(); 
    isPortrait = (orient=="Portrait");
    console.log( orient );
    
    //Get screen dimensions.
    sw = app.GetScreenWidth();
    sh = app.GetScreenHeight();
    tablet = app.IsTablet(); //( (sw > 1200 || sh > 1200) && dens < 320 );
    lowRes = ( sw < 800 && sh < 800 );
    
    //Get display dimensions and aspect ratio
    dw = app.GetDisplayWidth();
    dh = app.GetDisplayHeight();
    aspect = dw / dh;
    console.log( aspect );
      
    //Set theme.
    var theme = app.CreateTheme();
    theme.SetBackColor( "#bb000000" );
    theme.SetDialogColor( "#bb000000" );
    theme.SetTitleHeight( 42 );
    app.SetTheme( theme );

    //Set menus.
    menus = "New:Add.png,Connect:Connect.png,Exit:Exit.png"; 
    SetMenus( menus, "/assets/Img" );      
    
    //Disable normal back key functionality 
    //(unless we are launched from another app).
    //if( !sharedFiles && !sharedText )
        app.EnableBackKey( false );
    
    //Register for error broadcasts.
    app.SetOnBroadcast( app_OnBroadcast );
    
    //Check for test mode and SDK mode.
    if( app.FileExists( "/sdcard/DroidScript/_beta_") ) g_tester = true;
    if( app.FileExists( "/sdcard/DroidScript/_sdk_") ) g_sdk = true;
    
    //Set or unlock orientation.
    if( model.indexOf("ODROID") > -1 || forceOrient.toLowerCase()=="landscape" || headless ) 
    { 
		if( !isThings ) setTimeout( function(){app.SetOrientation( "Landscape" )},100 );
		else app.SetOrientation( "Landscape" );
		isSBC = true;
	}
	else setTimeout( function(){app.SetOrientation("")},100 );
    
    //Create the main graphical layout.
    if( !noGUI && (isRemix || isChrome || useAce) ) CreateAceLayout();
    else if( headless ) CreateHeadlessLayout( true );
    else CreateLayout();    
    
    //Detect keyboard showing and set focus to editor.
    app.SetOnShowKeyboard( app_OnShowKeyBoard );
		
	//Check for plugin licenses and handle plugins.
    CheckLicenses();   	
    ConvertApkPlugins();
    ImportUserPlugins();
    ListPlugins();
        
    //Check for auto wifi or chrome connect.
    if( autoWifi || headless ) Connect( false );
    
    //Get samples list for chrome etc.
    if( headless ) GetSamples();
    
    app.HideProgress();
    
    //Check for auto-start app.
    if( autoStart && autoStart!="null" && autoStart!="false" ) 
		LaunchApp( autoStart, "", "remote" );
}

//Called when shared data is received.
function OnData( isStartUp )
{
	//Check for any shared files from other apps
    //and pass on to user's programs.
    sharedFiles = app.GetSharedFiles();
    sharedText = app.GetSharedText();
    sharedIntent = app.GetIntent();
    app.SaveText( "_SharedFiles", sharedFiles, "spremote" );
    app.SaveText( "_SharedText", sharedText, "spremote" );
    
    //Handle spk files.
    if( sharedFiles && sharedFiles[0].indexOf(".spk")>-1 ) 
    {
		spkFile = sharedFiles[0];
		spkTitle = spkFile.substr( spkFile.lastIndexOf("/")+1 );
		var s = spkTitle;
		if( s=="download.spk" ) s = "this package";
		var installDiag = app.CreateYesNoDialog( "Script Package Installer:\n\nDo you trust the source of "+s+"?" );
		installDiag.SetOnTouch( installDiag_OnTouch );
		installDiag.Show();
    }
	//Check if we need to auto-launch user app.
    else if( sharedFiles || sharedText ) 
    {
        sharedApp = app.LoadText( "_SharedApp", null, "spremote" );
        if( sharedApp ) 
        { 
			startedByShare = isStartUp;
            LaunchApp( sharedApp, "" );
        }
    }
    
    //Check for pebble app running inside IDE.
	var intent = app.GetIntent();
	if( intent ) {
		for( var key in intent.extras ) {
			if( key=="Pebble_AppName" ) LaunchApp( intent.extras[key], "" );
		}
	}
    
    //else share general intent data.
    //**** Not sure we need this now, as it is best to call NewActivity directly ******
    /*else {
		 //if( sharedIntent && sharedIntent.extras.app )
			// LaunchApp( sharedIntent.extras.app, JSON.stringify(sharedIntent) );
    }*/
}

//Called when back button is pressed.
function OnBack()
{
	if( txtRemote.IsVisible() ) {
		txtRemote_OnTouchDown();
		return;
    }
    if( headless ) return;
    
    if( layMenu.GetVisibility()=="Show" ) {
        btnMenu_OnTouch();
    }
    else if( layDoc.GetVisibility()=="Show" ) {
        if( app.GetData("CurWebDoc")=="Documentation" ) btnDocs_OnTouch();
        else webDocs.Execute( "history.back();" );
    }
    else if( laySamp.GetVisibility()=="Show" ) 
    {
        if( layEditSamp.GetVisibility()=="Show" ) layEditSamp.SetVisibility( "Hide" );
        else btnSamp_OnTouch();
        HideCodingMenus();
    }
    else if( layFile.IsVisible() )
    {
        btnFiles_OnTouch();
        edit.Focus();
    }
    else if( laySrch.IsVisible() || layCC.IsVisible() ) 
    {
        HideCodingMenus( true );
        edit.Focus();
    }
    else if( layEdit.GetVisibility()=="Show" ) 
    { 
        //Save user's changes and hide menus.
        SaveFile();
        btnFiles.Hide();
        layFile.Hide();
        HideCodingMenus();
        if( layCopy.GetVisibility()=="Show" ) edit_OnDoubleTap();
        
        //Animate flip and stop timer.
        layFlip.Animate( "Flip", null, 350 );    
        clearTimeout( timer );
    }
    else {
    //if( !sharedFiles && !sharedText ) {
    	var yesNo = app.CreateYesNoDialog( T("ExitDroidScript") );
    	yesNo.SetOnTouch( yesNoExit_OnTouch );
    	yesNo.Show();
    //}
    }
}

//Called when application is paused.
function OnPause() 
{ 
}

//Called when application is resumed.
function OnResume() 
{ 
    if( sharedApp && startedByShare ) app.Exit();
}

//Handle Exit app choice.
function yesNoExit_OnTouch( result )
{
    if( result=="Yes" ) app.Exit();
}

//Set current language.
function SetLanguage()
{
    //Reset T() translation language.
    app.SetLanguage( language );
    
    //Load docs.
    var code = "-" + app.Language2Code( language );
    if( code=="-en" ) code = "";
    docsPath = "/sdcard/DroidScript/.edit/docs" + code;
    webDocs.LoadUrl( "file://" + docsPath + "/Docs.htm" );
    
    //Re-load sample list.
    lstSamp.SetList( GetSamples() );
    
    //Re-load menus.
    LoadMenus();
    
    //Re-Extract the 'Hello World' sample.
    app.ExtractAssets( "sdcard/"+app.Language2Code(), appPath, true );
    
    //Save language code (use by ide server).
    app.SaveText( "LanguageCode", app.Language2Code() );
}

//Handle spk installs.
function installDiag_OnTouch( result )
{
	if( result=="Yes" ) CheckPackage( spkFile );
	else app.ShowPopup( "Package rejected" );
}

//Set spacing of title and margins.
function SetTitleMargins()
{
    var left,right,top,bottom,width,height;
    
    //Set title bar size.
    layBar.SetSize( -1, topBarHeight );
    
    //Set title image size and margins.
    if( orient=="Portrait" ) { 
        width = (tablet?0.34:0.34); height = (tablet?0.040:0.055);
        left = (tablet?0.28:0.21);  right = (tablet?0.28:0.21);
        top = (lowRes?0.018:(tablet?0.012:0.014));  bottom = (lowRes?0.018:(tablet?0.012:0.014));
        if( tablet ) scale=0.63; else scale=0.24;
    }
    else {
        width = (tablet?0.24:0.24); height = (tablet?0.065:0.100); 
        left = (tablet?0.46:0.340);  right = (tablet?0.46:0.340);
        top = (lowRes?0.028:(tablet?0.022:0.025));  bottom = (lowRes?0.028:(tablet?0.022:0.025));
        if( tablet ) scale=0.53; else scale=0.72;
    }
    //imgTitle.SetSize( width, height );
    //imgTitle.SetMargins( left*scale,top,right*scale,bottom );
    btnFiles.SetSize( width, height );  //Note: Test these margins on multiple tablets!!
    if( orient=="Portrait" ) 
        btnFiles.SetMargins( tablet?(aspect>0.67?0.14:0.17):8,0,tablet?0.14:8,0,tablet?"":"dip" );
    else btnFiles.SetMargins( tablet?(aspect>0.67?0.26:0.28):0.2, 0, tablet?0.26:0.2, 0 );
    
    //Set title button sizes.
    if( orient=="Portrait" ) { width = (tablet?48:48);  height = (tablet?36:36);  }
    else { width = (tablet?48:48);  height = (tablet?36:36);  }
    btnDocs.SetSize( width, height, "dip" );
    btnConnect.SetSize( width, height, "dip" );
    btnFiles.SetSize( -1, height, "dip" );
    btnSamp.SetSize( width, height, "dip" );
    btnMenu.SetSize( width, height, "dip" );
}

//Re-set spacings and sizes of controls.
function AdjustLayout()
{
    var left,right,top,bottom,width,height;
    
    //Set samples and docs top padding (so we can see title bar).
   // if( orient=="Portrait" ) top = (lowRes?0.104:(tablet?0.066:0.080));
    //else top =topBarHeight
    laySamp.SetPadding( 0, topBarHeight, 0, 0 );
    layDoc.SetPadding( 0, topBarHeight, 0, 0 );
    
    //Reset programs list and gradient cover layer size.
    width = 1.0; height = 0.94;
    //lst.SetSize( width, height );
    //lst.SetPadding( (tablet?0.2:0.12), 0.01, (tablet?0.2:0.12), 0.01 );
    //imgGrad.SetSize( width, height );
    
    //Reset code editor dimensions.
    if( orient=="Portrait" ) height = (lowRes?0.83:(tablet?0.88:0.858));
    else height = (lowRes?0.83:(tablet?0.81:0.79));
    //xx scrollEdit.SetSize( 1.0, height );
    //xx if( orient=="Portrait" ) edit.SetSize( 1.5, -1 );
    //xx else edit.SetSize( 1.0, -1 );
    //edit.SetSize( 1.0, height );
    
    var barh = (orient=="Portrait"? bottomBarHeight : bottomBarHeight );
    edit.SetSize( 1.0, 1-topBarHeight-barh );
    layEditBtns.SetSize( 1.0, bottomBarHeight);
    
    //Set code editor button height.
    if( orient=="Portrait" ) height = (tablet?0.04:0.052);
    else height = (tablet?0.06:0.082);
    var width = 0.135;
    btnUndo.SetSize( width, height );
    btnRedo.SetSize( width, height );
    btnNew.SetSize( width, height );
    btnAsset.SetSize( width, height );
    btnDbg.SetSize( width, height );
    btnExec.SetSize( width, height );
    
    //Reset sample editor dimensions.
    if( orient=="Portrait" ) height = (lowRes?0.83:(tablet?0.88:0.86));
    else height = (lowRes?0.83:(tablet?0.81:0.76));
    //xx scroll.SetSize( 1.0, height );
    //xx if( orient=="Portrait" ) editSamp.SetSize( 1.5, -1 );
    //xx else editSamp.SetSize( 1.0, -1 );
    editSamp.SetSize( 1.0, height );
    
    //Set sample edtor button height.
    if( orient=="Portrait" ) height = (tablet?0.044:0.052);
    else height = (tablet?0.066:0.082);
    btnCopy.SetSize( 0.26, height );
    btnRun.SetSize( 0.26, height );
    
    //Set documentation size.
    webDocs.SetSize( 1.0, 1-topBarHeight );
    
    //Set menu position.
    if( orient=="Portrait" ) layMenu.SetPosition( tablet?0.6:0.5, topBarHeight );
    else layMenu.SetPosition( 0.72, topBarHeight );
    
    //Set file list position.
    layFile.SetPosition( isPortrait?0.3:0.385, topBarHeight );
}

//Called when configuration changes.
function OnConfig() 
{        
	if( headless ) return;
	
	try 
	{
	    //Resize terminal if visible.
	    if( term ) term.Resize();
	    	
		//Get new orientation.
		orient = app.GetOrientation();  
		isPortrait = (orient=="Portrait");

		//Calculate scaling val to keep objects same size.
		if( orient=="Portrait"  ) fix = 1;
		else fix = dw/dh;
		
		//Re-position controls.    
		PrepareCodingMenus();
		SetTitleMargins();
		AdjustLayout();
	    
	    ResizeCodingMenus();
	    
		ShowIcons();
		ignoreIcons = false;
    }
    catch(e) {}
}

//Handle wifi connect button.
function btnConnect_OnTouch()
{
    HandleMenu( "Connect" );
}

//Load the main menus.
function LoadMenus()
{
	var sdk = (g_sdk || premium ? ",SDK": "" );
	lstMenu.SetList( T("New")+","+T("Plugins")+","+T("Settings")+","+T("Demos")
	        +","+T("News")+","+T("Premium")+sdk+","+T("Shop")+","+T("About") ); 
}

//Set menus.
function SetMenus( list, images )
{
    //Do nothing.
    //app.SetMenu( list );
}

//Handle custom menu.
function lstMenu_OnTouch( item )
{
    btnMenu_OnTouch();
    HandleMenu( item );
}

//Called when user selects a menu item.
function OnMenu( name )
{  
    if( name==null ) btnMenu_OnTouch();
    //HandleMenu( name );
}

//Start wifi edit server.
function Connect( prompt )
{
	if( useADB ) {
		if( prompt ) app.Alert( T("UseADB"), "ADB Connect" );
	}
	else {
		if( !app.IsConnected() ) { 
			if( prompt ) { app.ShowPopup( T("ActivateWifi") ); return; }
		}
		if( prompt ) app.Alert( T("UseWifi") + app.GetIPAddress()+":8088\n\n" + 
			(usePass?T("Password")+": "+password :""), T("WifiConnect"), "" );
    }

    app.StartDebugServer();
    if( !headless ) btnConnect.SetTextColor("#97C024");
    
    //Allow discovery via UDP.
    if( app.IsAPK() ) 
    {
        if( !net ) net = app.CreateNetClient( "UDP" );
    	address = net.GetBroadcastAddress();
    	SendDiscoveredMessage();
    	clearInterval( udpTimer );
    	udpTimer = setInterval( CheckForMsg, 1000 );
    }
	
	//Start browse server if premium.
	if( premium ) StartBrowseServer();
}
 
//Broadcast our Datagram (UDP) packet.
function SendDiscoveredMessage()
{
    var jsonData = {};
    jsonData["appname"] = "DroidScript";
    jsonData["devicename"] = deviceName; 
    jsonData["macaddress"] = app.GetMacAddress();
    jsonData["version"] = app.GetVersion();
    jsonData["usepass"] = usePass; 
    
	net.SendDatagram( JSON.stringify(jsonData), "UTF-8", address, port );
}

//Called by our interval timer.
function CheckForMsg()
{
    //Try to read a packet for 1 millisec.
	var packet = net.ReceiveDatagram( "UTF-8", port, 1 );
	if( packet ) { 
	    if( packet.localeCompare("DISCOVER_DSSERVER_REQUEST") == 0 )
	        SendDiscoveredMessage();
	}
}

//Called when user selects a menu item.
function HandleMenu( name )
{      
    if( name==T("New") ) {
        ShowTextDialog( T("NewApp"), "", "Native,HTML,Espruino", "OnAdd" );
    }
    else if( name=="Connect" ) {
       Connect( true );
    }
    else if( name=="Exit" ) {
        app.Exit( true );   
    }
    else if( name==T("About") ) {
        ShowAbout();
    }
    else if( name==T("Shop") ) {
        ShowShop();
    }
    else if( name==T("Settings") ) {
        ShowSettings();
    }
    else if( name==T("Plugins") ) {
        ShowPlugins();
    }
    else if( name==T("Demos") ) {
        ShowDemos();
    }
    else if( name==T("News") ) {
        ShowNews();
    }
    else if( name==T("Premium") ) {
        ShowPremium();
    }
    else if( name=="SDK" ) {
		ShowSDKDialog();
	}
    else if( name=="Build APK" ) {
        lstOps_Select( name );
    }
}

//Show custom slide out menu.
function btnMenu_OnTouch()
{
    if( layMenu.GetVisibility()=="Hide" ) {
        if( !usingAce ) { 
            HideCodingMenus();
            if( layFile.IsVisible()) layFile.Animate( "ScaleToTop" );
        }
        layMenu.Animate( "ScaleFromTop" );
    }
    else {
        layMenu.Animate( "ScaleToTop" );
        
        if( !usingAce )
        {
            //Show info bar and start code completion if editing.
            if( layEdit.GetVisibility()=="Show" ) {
                setTimeout( "layInfo.SetVisibility('Show')", 250 );
                ccTimer = setInterval( CheckForCodeSuggestions, 500 );
            }
        }
    }
}

//Show slide out files menu.
function btnFiles_OnTouch()
{
    if( layFile.GetVisibility()=="Hide" ) {
        if( !usingAce ) { 
            HideCodingMenus();
            if( layMenu.IsVisible() ) layMenu.Animate( "ScaleToTop" );
        }
        layFile.Animate( "ScaleFromTop" );
    }
    else {
        layFile.Animate( "ScaleToTop" );
        
        if( !usingAce )
        {
            //Show info bar and start code completion if editing.
            if( layEdit.GetVisibility()=="Show" ) {
                setTimeout( "layInfo.SetVisibility('Show')", 250 );
                ccTimer = setInterval( CheckForCodeSuggestions, 500 );
            }
        }
    }
}

//Create the graphical layout.
function CreateLayout()
{
    //Remove old layouts if they exist.
    if( layBack ) app.RemoveLayout( layBack );
    if( layFront ) app.RemoveLayout( layFront );
    if( laySamp ) app.RemoveLayout( laySamp );
    if( layDoc ) app.RemoveLayout( layDoc );
        
    //Prepare popup editing and coding menus.
    PrepareCodingMenus();
    
    //--- Background screen -----
    
    layBack = app.CreateLayout( "linear", "vcenter,fillxy" );  
    
    //Create text for remote connection message.
    txtRemote = app.CreateText( "Hello",-1,-1,"fontawesome" );
	txtRemote.SetTextSize( 22 );
	txtRemote.SetOnTouchDown( txtRemote_OnTouchDown );
	txtRemote.Gone();
	layBack.AddChild( txtRemote );
	
    //--- Main Screen ----------

    //Create main layout for buttons etc.
    layFront = app.CreateLayout( "linear", "vertical,fillxy,touchthrough" );    

    //Create title bar and buttons.
    layBar = app.CreateLayout( "Linear", "horizontal,vcenter,fillx" );    
    layBar.SetBackground( "/res/drawable/bar_gray" );
    layBar.SetSize( -1, topBarHeight );
    btnDocs = app.CreateButton( "[fa-book]", (tablet?0.16:0.23), (tablet?0.038:0.04), "bar-gray,fontawesome" );
    btnDocs.SetOnTouch( btnDocs_OnTouch );
    btnDocs.SetTextSize("16", "dip");
    btnDocs.SetTextColor("#dddddd");
    layBar.AddChild( btnDocs );
    
    btnConnect = app.CreateButton( "[fa-wifi]", (tablet?0.16:0.23), (tablet?0.038:0.04), "bar-gray,fontawesome" );
    //btnConnect.SetSize( (tablet?0.08:0.13), (tablet?0.040:0.056) );
    btnConnect.SetOnTouch( btnConnect_OnTouch );
    btnConnect.SetMargins(0.02,0,0,0);
    btnConnect.SetTextSize("16", "dip");
    btnConnect.SetTextColor("#999999");
    //btnConnect.SetPadding(0,0,0,4,"dip");
    layBar.AddChild( btnConnect );

    //imgTitle = app.CreateImage( "/assets/Img/AScript.png", (tablet?0.052:0.07), (lowRes?0.05:(tablet?0.033:0.039)), "" );
    //layBar.AddChild( imgTitle );
    btnFiles = app.CreateButton( "", (tablet?0.08:0.13), (tablet?0.040:0.055), "bar-gray,singleline" );
    //btnFiles.SetSize( (tablet?0.16:0.26), (tablet?0.040:0.056) );
    btnFiles.SetOnTouch( btnFiles_OnTouch );
    btnFiles.SetMargins(0.04,0,0.04,0);
    btnFiles.SetTextSize( lowRes?12:14, "dip");
    btnFiles.SetTextColor("#dddddd");
    btnFiles.SetEllipsize( "end" );
    //btnFiles.SetPadding(0,0,0,0.014);
    btnFiles.Hide();
    layBar.AddChild( btnFiles );
    
    btnMenu = app.CreateButton( "[fa-ellipsis-v]", (tablet?0.08:0.13), (tablet?0.040:0.055), "bar-gray,fontawesome" );
    //btnMenu.SetSize( (tablet?0.08:0.13), (tablet?0.040:0.056) );
    btnMenu.SetOnTouch( btnMenu_OnTouch );
    btnMenu.SetMargins(0,0,0.02,0);
    btnMenu.SetTextSize("14", "dip");
    btnMenu.SetTextColor("#dddddd");
    //btnMenu.SetPadding(0,0,0,0.014);
    layBar.AddChild( btnMenu );
    
    btnSamp = app.CreateButton( "[fa-rocket]", (tablet?0.16:0.23), (tablet?0.038:0.04), "bar-gray,fontawesome" );
    btnSamp.SetOnTouch( btnSamp_OnTouch );
    btnSamp.SetTextSize("16", "dip");
    btnSamp.SetTextColor("#dddddd");
    layBar.AddChild( btnSamp );
    layFront.AddChild( layBar );
    SetTitleMargins();
    
    //Create layout to allow flipping of list/code.
    layFlip = app.CreateLayout( "Frame", "" );
    
    //Create TextEdit control to edit code (invisible at first).
    layEdit = app.CreateLayout( "Linear", "Vertical,FillXY" );
    layEdit.SetVisibility( "Hide" );
    edit = app.CreateCodeEdit( "", 1.0, (lowRes?0.83:(tablet?0.88:0.86)), "" );
    if( useDarkTheme ) edit.SetColorScheme( "Dark" );
    edit.SetTextSize( textSize );
    edit.SetPadding( 0.02,0,0,0 ); 
    edit.SetOnChange( edit_OnChange );
    edit.SetOnKey( edit_OnKey );
    edit.SetOnDoubleTap( edit_OnDoubleTap );
    edit.SetUseKeyboard( useSoftKeys );
    edit.SetNavigationMethod( useYoyo ? "Yoyo" : "Touch" );
    layEdit.AddChild( edit );
    
    //Create editing buttons.
    layEditBtns = app.CreateLayout( "Linear", "Horizontal,VCenter,FillX" );
    //layEditBtns.SetPadding( 0,0.006,0,0.006 );
    layEditBtns.SetBackColor( "#ff777777" );
    layEditBtns.SetSize( 1.0, bottomBarHeight);
    
    btnUndo = app.CreateButton( "[fa-undo]", 0.14, (tablet?0.04:0.06), "gray,fontawesome" );
    btnUndo.SetOnTouch( btnUndo_OnTouch );
    btnUndo.SetTextSize( 14, "pl");
    layEditBtns.AddChild( btnUndo );
    
    btnNew = app.CreateButton( "[fa-file-text]", 0.14, (tablet?0.04:0.06), "gray,fontawesome" );
    btnNew.SetMargins( 0.03,0,0,0 );
    btnNew.SetOnTouch( btnNew_OnTouch );
    btnNew.SetTextSize( 14, "pl");
    layEditBtns.AddChild( btnNew );
    
    btnAsset = app.CreateButton( "[fa-picture-o]", 0.14, (tablet?0.04:0.06), "gray,fontawesome" );
    btnAsset.SetMargins( 0.03,0,0,0 );
    btnAsset.SetOnTouch( btnAsset_OnTouch );
    btnAsset.SetTextSize( 14, "pl");
    layEditBtns.AddChild( btnAsset );
    
    btnDbg = app.CreateButton( "[fa-bug]", 0.14, (tablet?0.04:0.06), "gray,fontawesome" );
    btnDbg.SetMargins( 0.03,0,0.03,0 );
    btnDbg.SetTextSize( 14, "pl");
    btnDbg.SetOnTouch( btnDbg_OnTouch );
    layEditBtns.AddChild( btnDbg );
    
    btnExec = app.CreateButton( "[fa-play]", 0.14, (tablet?0.04:0.06), "gray,fontawesome" );
    btnExec.SetMargins( 0,0,0.03,0 );
    btnExec.SetTextSize( 14, "pl");
    btnExec.SetOnTouch( btnExec_OnTouch );
    layEditBtns.AddChild( btnExec );
   
    btnRedo = app.CreateButton( "[fa-repeat]", 0.14, (tablet?0.04:0.06), "gray,fontawesome" );
    btnRedo.SetOnTouch( btnRedo_OnTouch );
    btnRedo.SetTextSize( 14, "pl");
    layEditBtns.AddChild( btnRedo );
    
    layEdit.AddChild( layEditBtns );
    layFlip.AddChild( layEdit );
    
    //Create program list control.
    layLst = app.CreateLayout( "Frame", "FillXY" );
    if( useDarkTheme ) layLst.SetBackground( "/res/drawable/android_dark" );
    else layLst.SetBackground( "/res/drawable/android" );    
    
    //Show user's program icons if starting in portrait
    //mode, else it's done in OnConfig.
    if( startOrient=="Portrait" ) ShowIcons();
    
    //Create translucent gradient image above list.
    //imgGrad = app.CreateImage( null, 1.0, 0.94, "" ); 
    //imgGrad.SetBackGradientRadial( 0.5, 0.2, 2.0, "#00000000", "#88000000" );
    //imgGrad.SetTouchable( false );
    //layLst.AddChild( imgGrad );
    
    layFlip.AddChild( layLst );
    layFront.AddChild( layFlip );
    
    //--- Custom slide down options layout -----
    
    layMenus = app.CreateLayout( "Absolute", "fillxy,touchthrough" );
    layMenu = app.CreateLayout( "Linear" );
    //layMenu.SetMargins( 0.15, (tablet?0.065:0.076), 0,0 );
    layMenu.SetPosition( 0.50, (tablet?0.065:0.076) );
    layMenu.SetVisibility( "Hide" );
    layMenus.AddChild( layMenu );
    
    lstMenu = app.CreateList( "", 0.3,-1, "FillXY,normal" );    
    lstMenu.SetPadding( 0,0.005,0,0,0 );
    lstMenu.SetBackColor( "#ee333333" );
    lstMenu.SetTextSize( 18, "dip" );
    lstMenu.SetOnTouch( lstMenu_OnTouch );
    layMenu.AddChild( lstMenu );
    LoadMenus();
    
    //--- Slide down file list -----
    
    layFiles = app.CreateLayout( "Absolute", "fillxy,touchthrough" );
    layFile = app.CreateLayout( "Linear" );
    //layFile.SetMargins( 0.15, (tablet?0.065:0.076), 0,0 );
    layFile.SetPosition( isPortrait?0.3:0.385, topBarHeight );
    layFile.SetVisibility( "Hide" );
    layFiles.AddChild( layFile );
    
    lstFiles = app.CreateList( "", 0.4,-1, "FillXY,normal" );    
    lstFiles.SetPadding( 0,0.005,0,0,0 );
    lstFiles.SetBackColor( "#ee333333" );
    lstFiles.SetTextSize( lowRes?16:18, "dip" );
    lstFiles.SetOnTouch( lstFiles_OnTouch );
    lstFiles.SetOnLongTouch( lstFiles_OnLongTouch );
    layFile.AddChild( lstFiles );
    
    //---  Samples Screen -------
    
    //Create an (initially invisible) layout to show samples.
    laySamp = app.CreateLayout( "Absolute", "fillxy,touchthrough" );
    laySamp.SetPadding( 0, (lowRes?0.104:(tablet?0.066:0.080)), 0, 0 ); 
    laySamp.SetVisibility( "Hide" );
    layExamp = app.CreateLayout( "Frame", "vertical,fillxy" );
    layExamp.SetBackColor( "#ff222222" );
    
    //Create list of samples.
    var listArray = GetSamples();
    
    lstSamp = app.CreateList( listArray, -1, -1, "FillXY,WhiteGrad,Html" );    
    lstSamp.SetTextColor1( "#ff555558" );
    lstSamp.SetTextColor2( "#ff555558" );
    lstSamp.SetTextMargins( 0.04, 0, 0, 0 ); 
    lstSamp.SetOnTouch( lstSamp_OnTouch );
    lstSamp.SetOnLongTouch( lstSamp_OnLongTouch );
    layExamp.AddChild( lstSamp );
    
    //Create text control showing code.
    layEditSamp = app.CreateLayout( "Linear", "Vertical,FillXY" );
    layEditSamp.SetVisibility( "Hide" );
    editSamp = app.CreateCodeEdit( "", 1, (lowRes?0.83:(tablet?0.88:0.86)), "NoSpell,NoKeyboard" );
    editSamp.SetTextSize( textSize );
    editSamp.SetPadding( 0.02,0,0,0 ); //<-needed for keyboard space.
    editSamp.SetOnDoubleTap( edit_OnDoubleTap );
    editSamp.SetNavigationMethod( useYoyo ? "Yoyo" : "Touch" );
    layEditSamp.AddChild( editSamp );
    
    //Create horizontal layout for buttons.
    layBtns = app.CreateLayout( "Linear", "Horizontal,VCenter,FillX" );
    layBtns.SetBackColor( "#ff777777" );
    layBtns.SetPadding( 0,0.006,0,0.006 );
    
    //Create button to zoom out.
   // btnZoomOut = app.CreateButton( "-", 0.16, 0.05, "gray" );
   // btnZoomOut.SetOnTouch( btnZoomOut_OnTouch );
    //layBtns.AddChild( btnZoomOut );
    
    //Create button to copy sample.
    btnCopy = app.CreateButton( "[fa-copy]", 0.26, (tablet?0.04:0.06), "gray,fontawesome" );
    btnCopy.SetMargins( 0.08,0,0.08,0 );
    btnCopy.SetTextSize( 14, "pl");
    btnCopy.SetOnTouch( btnCopy_OnTouch );
    layBtns.AddChild( btnCopy );
    
    //Create button to launch sample.
    btnRun = app.CreateButton( "[fa-play]", 0.26, (tablet?0.04:0.06), "gray,fontawesome" );
    btnRun.SetMargins( 0.08,0,0.08,0 );
    btnRun.SetTextSize( 14, "pl");
    btnRun.SetOnTouch( btnRun_OnTouch );
    layBtns.AddChild( btnRun );
    
    //Create button to zoom in.
   // btnZoomIn = app.CreateButton( "+", 0.16, 0.05, "gray" );
   // btnZoomIn.SetOnTouch( btnZoomIn_OnTouch );
   // layBtns.AddChild( btnZoomIn );
  
    layEditSamp.AddChild( layBtns );
    layExamp.AddChild( layEditSamp );
    laySamp.AddChild( layExamp );
    
    //--- Documentation Screen -------
    
    //Create an (initially invisible) layout to show docs.
    layDoc = app.CreateLayout( "Absolute", "fillxy,touchthrough" );
    layDoc.SetPadding( 0, topBarHeight, 0, 0 ); 
    layWeb = app.CreateLayout( "Linear", "vertical,fillxy" );
    layWeb.SetBackGradient( "#ffdddddd", "#ffaaaaaa" );
    layDoc.SetVisibility( "Hide" );
    
    webDocs = app.CreateWebView( 1.0, 1-topBarHeight-bottomBarHeight, "NoLongTouch,IgnoreErrors,ScrollFade" );
    //webDocs.LoadUrl( "file:///android_asset/edit/docs/Docs.htm" );
    //var docsPath = "file:///sdcard/DroidScript/.edit/docs-"+language.toLowerCase();
    //webDocs.LoadUrl( docsPath + "/Docs.htm" );
    layWeb.AddChild( webDocs );
    layDoc.AddChild( layWeb );
    
    //Set language.
	SetLanguage();
    
    //---------------------------------
    
    //Adjust layout according to orientation.
    AdjustLayout();
    
    //Hide main layout if required.
    if( sharedApp ) layFront.SetVisibility("Hide");
    
    //Add main layouts to app. 
    app.AddLayout( layBack );   
    app.AddLayout( layFront );
    app.AddLayout( laySamp );    
    app.AddLayout( layDoc );   
    
    //Create popup coding menus.
    CreateCodingMenus();
}

//Create basic layout when running in chrome.
function CreateHeadlessLayout( debug )
{
    var msg;
    if( useADB ) msg = "Run 'DroidScript Connect' and type the following" + 
		" address into your web browser:\n127.0.0.1:8088";
	else msg = "Type the following address into your web browser:\n" + app.GetIPAddress()+":8088";
	
	var lay = app.CreateLayout( "linear", "VCenter,FillXY" );
	lay.SetPadding( 0.04,0,0.04,0 );
	if( debug ) txtDebug = app.CreateText( msg,-1,-1,"FillXY,Log" );
	else txtDebug = app.CreateText( msg,-1,-1,"MultiLine" );
	txtDebug.SetTextSize( debug?12:22 );
	lay.AddChild( txtDebug );	
	app.AddLayout( lay );
	
	//Capture remote logging.
	if( debug ) app.SetOnDebug( OnDebug );
}

//Create a theme for all controls and dialogs.
function CreateTheme()
{
    theme = app.CreateTheme( "Light" );
    theme.AdjustColor( 35, 0, -10 );
    theme.SetBackColor( "#ffffffff" );
    theme.SetBtnTextColor( "#000000" );
    theme.SetButtonOptions( "custom" );
    theme.SetButtonStyle( "#fafafa","#fafafa",5,"#999999",0,1,"#ff9000" );
    theme.SetCheckBoxOptions( "dark" );
    theme.SetTextEditOptions( "underline" );
    theme.SetDialogColor( "#eeeeee" );
    theme.SetDialogBtnColor( "#ffeeeeee" );
    theme.SetDialogBtnTxtColor( "#ff666666" );
    theme.SetTitleHeight( 36 );
    theme.SetTitleColor( "#ff888888" ); 
    theme.SetTitleDividerColor( "#cccccc" );
    theme.SetTextColor( "#000000" );
    app.SetTheme( theme );
}

//Send remote debug messages to headless log.
function OnDebug( msg )
{
	if( txtDebug ) txtDebug.Log( msg );
}

//Create webview based layout when running on Vim/Chromebook.
function CreateAceLayout()
{
    usingAce = true;
	
	var lay = app.CreateLayout( "linear", "VCenter,FillXY" );	
	lay.SetBackColor( "black" );
	
	//Create text for remote connection message.
	txtRemote = app.CreateText( "",-1,-1,"fontawesome" );
	txtRemote.SetTextSize( 16 );
	txtRemote.SetOnTouchDown( txtRemote_OnTouchDown );
	txtRemote.Gone();
	lay.AddChild( txtRemote );
	
	webAce = app.CreateWebView( -1,-1, "IgnoreErrors,FillXY" );
	webAce.Focus();
	app.SetOptions( "AllowRemote" );
	lay.AddChild( webAce );
  
	layMenus = app.CreateLayout( "Absolute", "filXlxy,touchthrough" );
	layMenus.SetOnTouch( function(){ if(layMenu.IsVisible()) btnMenu_OnTouch()} );
    layMenu = app.CreateLayout( "Linear", "filxxlxy" );
    layMenu.SetPosition( 0.84, 0.08 );
    //layMenu.SetMargins( 8,8,8,8, "dip" );
    //layMenu.SetMargins( 0.15, (tablet?0.065:0.076), 0,0 );
    layMenu.SetVisibility( "Hide" );
    layMenus.AddChild( layMenu );
    
    var layFrame = app.CreateLayout( "Linear" );
    layFrame.SetBackground( "/res/drawable/picture_frame" );
    layMenu.AddChild( layFrame );
    
    var sdk = (g_sdk ? ",SDK": "" );
    var menu = "Plugins,Demos,News,Premium"+sdk+",Shop,About,Build APK";
    lstMenu = app.CreateList( menu, 0.16,-1, "Menu,Expand" );    
    lstMenu.SetPadding( 0,0,0,0,0 );
    lstMenu.SetBackColor( "#ffffff" );
    lstMenu.SetTextSize( 10 );
    lstMenu.SetOnTouch( lstMenu_OnTouch );
    layFrame.AddChild( lstMenu );
	
	app.AddLayout( lay );
	app.AddLayout( layMenus );
	
	//setTimeout( function(){ webAce.LoadUrl("file:///sdcard/DroidScript/.edit/index.html"); }, 500 );
	setTimeout( function(){ webAce.LoadUrl("http:///127.0.0.1:8088"); }, 100 ); //500
}

//Disconnect a remote IDE user.
function txtRemote_OnTouchDown()
{
    var yesNo = app.CreateYesNoDialog( T("Disconnect")+"?" );
    yesNo.SetOnTouch( OnDisconnect );
    yesNo.Show();
}

//Handle delete 'are you sure' dialog.
function OnDisconnect( result )
{
    if( result=="Yes" ) 
    {
        app.StopDebugServer();
        OnIdeDisconnect("");
        if( !webAce ) { btnConnect.SetTextColor("#999999"); ShowIcons(); }
        else { app.StartDebugServer(); webAce.Execute("onStop()"); }
    }
}

//Launch remix browser link,
function txtRemix_OnTouchDown()
{
	app.OpenUrl( "http://127.0.0.1:8088" );
}
    
//Handle soft-keyboard show and hide.
function app_OnShowKeyBoard( shown )
{
    if( term ) term.Resize();
    
    //HandleShowKeyBoard( shown );
    if( !headless ) ResizeCodingMenus();
}

//Create icon layout to show user's programs.
function ShowIcons()
{
	if( headless ) return;
	
    //Remove current icon layout (and free old objects).
    if( scrollIcons ) layLst.DestroyChild( scrollIcons );
    
    //Create scroller.
    scrollIcons = app.CreateScroller( 1,1-topBarHeight );
    
    //Create icon layout.
    layIcons = app.CreateLayout( "Linear", "FillXY,Left" );
    layIcons.SetPadding(0,0.02,0,0);
    scrollIcons.AddChild( layIcons );
    
    //Get list of user's programs.
    var progList = GetProgramList().split(",");
    
    //Set icons per row count.
    var iconsPerRow = tablet ? 5 : 4;
    if( orient=="Landscape" ) { iconsPerRow = tablet ? 8 : 7; }
    var iconW = 0.76/(iconsPerRow);
     
    //Create an icon for each program.
    for( var i=0; i<progList.length && progList[0]!=""; i++ )
    {
        if( i%iconsPerRow==0 ) {
            layIconsHoriz = app.CreateLayout( "Linear", "Horizontal" );
            layIcons.AddChild( layIconsHoriz );
        }
        //Create icon/text layout.
        var layIcon = app.CreateLayout( "Linear", "Vertical" );
        layIcon.SetMargins( 0.082/iconsPerRow, 0, 0.082/iconsPerRow, 0 );
        layIconsHoriz.AddChild( layIcon );
        
        //Get program icon.
        var file = appPath+"/"+progList[i]+"/Img/"+progList[i]+".png";
        if( !app.FileExists( file ) ) file = "/assets/Img/Icon.png";
        
        //Create icon image.
        var imgIcon = app.CreateImage( file, iconW, -1, "Square" ); 
        if( !imgIcon ) imgIcon = app.CreateImage( "/assets/Img/Icon.png", iconW, -1 ); 
        imgIcon.SetName( progList[i] );
        imgIcon.SetOnTouchUp( lst_OnTouchUp );
        imgIcon.SetOnTouchDown( lst_OnTouchDown );
        imgIcon.SetOnLongTouch( lst_OnLongTouch );
        layIcon.AddChild( imgIcon );
        
        //Create text label.
        var txtIcon = app.CreateText( progList[i], iconW*1.1, -1, "Multiline" );
        txtIcon.SetTextSize( lowRes?14:15, "dip" );
        txtIcon.SetTextColor( useDarkTheme ? "#ffeeeeee" : "#ff666666" );
        layIcon.AddChild( txtIcon );
    }
    
    layLst.AddChild( scrollIcons );
    
    //Remove and re-add grad (so it does not get covered up).
    //if( imgGrad ) {
    //	layLst.RemoveChild( imgGrad );
	//	layLst.AddChild( imgGrad );
    //}
}


//Get user program list (excluding folders with ~ char at start).
function GetProgramList()
{
    var progList = "";
    var list = app.ListFolder( appPath,"",0,"alphasort");
    for( var i=0; i<list.length; i++ )
    {
        if( list[i].substr(0,1)!="~" )
        {
            if( app.FileExists( appPath+"/"+list[i]+"/"+list[i]+".js" ) ||
					app.FileExists( appPath+"/"+list[i]+"/"+list[i]+".html" ) ) 
			{
                if( progList.length>0 ) progList += ",";
                progList += list[i];
            }
        }
    }
    return progList;
}

//Get list of files in current program.
function GetFilesList()
{
    //List files in this project.
    var progPath = appPath+"/"+curProgram;
    var pattern = ".*\.js|.*\.html|.*\.txt|.*\.css|.*\.json";
    var list = app.ListFolder( progPath,pattern,0,"alphasort,regex,files");
    
    //Put main file to front of list.
    if( curProgTitle )
    {
		var idx = list.indexOf( curProgTitle );   
		list.splice(idx, 1);
		list.unshift( curProgTitle );
    }
    return list;
}

//Handle program selection.
function lst_OnTouchDown( e )
{
    imgTouchedIcon = app.GetLastImage();
    imgTouchedIcon.SetAlpha( 0.6 );
    setTimeout( "imgTouchedIcon.SetAlpha( 1.0 )", 1000 );
}

//Handle program selection.
function lst_OnTouchUp( e )
{
    var img = app.GetLastImage();
    img.SetAlpha( 1.0 );
    
    //Get program name.
    //item = item.split(":")[0];
    //curProgram = item;
    //curProgram = e.source;

    //Make sure we have shut down previous program's process.
    //(Prevents script caching)
    //var pid = app.GetData( "PID" );
    //if( pid ) app.KillApp( pid );
    //if( pid ) app.StopApp("");
    
    //Check for smartwatch services.
    if( e.source.GetName().substr(0,3).toLowerCase()=="sws" )
    {
        app.Alert( "SmartWatch service apps can only be started from a Smart Watch!" );
        return;
    }
    
    //Execute program.
    isWebIDE = false;
    LaunchApp( e.source.GetName(), "" );
    
    //Save last app.
    app.SaveText( "_LastApp", e.source.GetName(), "spremote" );
}

//Execute program in it's own process.
function LaunchApp( name, intent, options )
{
    //Set current program name.
    curProgram = name;
    isSample = false;
    
	//Check for html app.
	var htmfile = appPath+"/"+curProgram+"/"+curProgram+".html"
	if( app.FileExists( htmfile ) ) isHtml = true;
	else isHtml = false;
    
    //Check for transparent app.
    var extraOps = "";
    if( HasOption("transparent") ) { 
		if( !premium ) { alert( "Transparent Apps are a Premium feature!" ); return; }
		else extraOps = "transparent";
	}
	
	//Check for Espruino app.
	if( app.FileExists( appPath+"/"+curProgram+"/.espruino" ) )
    {
        _LoadScriptSync( "/Sys/esp.js" )
        _LoadScriptSync( "/Sys/term.js" )
        if( !espruino ) espruino = new Espruino();
        if( !term ) term = new Terminal( espruino );
        
	    term.Show( true );
	    var js = app.ReadFile( appPath+"/"+curProgram+"/"+ curProgram+".js" );
	    espruino.Send( js, term );
	    return;
	}
	    
	//Check for nodom option (use standalone v8 engine with thread boost).
	if( HasOption("nodom") ) extraOps += extraOps?",":"" + "nodom";
    
    //Clear the app log.
    if( txtDebug ) txtDebug.Log( "--- "+name+" ---", "Clear" )
    
    //Start the app.
    if( options ) app.StartApp( appPath+"/"+name+"/"+name+".js", options+extraOps, intent );
    else app.StartApp( appPath+"/"+name+"/"+name+".js", g_debugParams+extraOps, intent );
}

//Check if the current project has a particular option set.
function HasOption( option )
{
    var code = app.ReadFile( appPath+"/"+curProgram+"/"+curProgram + (isHtml?".html":".js") );
    var re = /_AddOptions\( ?["|'](.*?)["|'] ?\)/g;
    while( match = re.exec(code) ) {
        var ops = match[1].split(",");
        for( i in ops ) {
            if( ops[i].toLowerCase()==option ) return true;
        }
    }
    return false;
}

//Handle broadcast msg from user's app (errors etc).
function app_OnBroadcast( type, msg )
{
    if( type=="ShowError" && !isSample && !isWebIDE && !headless ) 
    {
        //Prevent auto-close of app.
        if( sharedApp ) { 
            sharedApp = null;
            layFront.SetVisibility("Show");
        }
        //Get message.
        msg = msg.split("|");
        var error = msg[0]; 
        var line = parseInt(msg[1])-1;
        var file = msg[2].replace("file://",""); 
        var fileTitle = file.substr( file.lastIndexOf("/")+1 );
        
        //Detect errors on app.js (ie. OnStart not defined etc).
        //if(file.indexOf("app.js")>-1 || file.indexOf("nxt.js")>-1
		//	|| file.indexOf("tabs.js")>-1 ) line = -1;
		
		//Detect errors on non-project files (eg app.js exernal libs).	
		var appFiles = GetFilesList();
		if( !appFiles.find( function(s){return s.indexOf(fileTitle)>-1} ) ) line = -1;
        
        //Handle service error.
        if( file.indexOf("Service.js")>-1 ) {
			var pid = app.GetData( "PID" );
			if( pid ) app.KillApp( pid );
			app.Alert( error, "Service Error" );
			return;
		}
        
        //Handle SW2 service error.
        if( !curProgram || file.indexOf("SWS-")>-1 ) {
			app.Alert( error );
			curProgram = fileTitle.replace(".js","");
		}
        
        //Re-load code.
        var code = null;
        if( line < 0 ) LoadFile( curProgram );
        else LoadFile( curProgram, fileTitle );
        
        //Open editor.
        //if( layEdit.GetVisibility()!="Show" ) 
        //    lstOps_Select( "Edit", "NoSetCols" )
        
        //Highlight current error line and start code completion.
        lastCursorLine = line;
        setTimeout( "edit.HighlightLine("+line+")", 300 );
        clearInterval( ccTimer );
        ccTimer = setInterval( CheckForCodeSuggestions, 500 );
    }
}

//Handle program long press.
function lst_OnLongTouch( e )
{
    var img = app.GetLastImage();
    img.SetAlpha( 1.0 );
    
    //Get program name.
    //item = item.split(":")[0];
    curProgram = e.source.GetName();

    //Show options dialog.
    var sOps = T("Edit")+","+T("Rename")+","+T("Copy")+","+T("Delete")
        +","+T("CreateShortcut")+","+T("ShareSPK")+","+T("SaveSPK")+","+T("BuildAPK"); 
    lstOps = app.CreateListDialog( T("Actions"), sOps, "ShowNow" );
    lstOps.SetOnTouch( lstOps_Select ); 
}

//Handle file selection.
function lstFiles_OnTouch( item, body, type, pos )
{
    btnFiles_OnTouch();
 
    //Check premium feature.
    if( pos > 2 && !premium ) {
        alert( "Please upgrade to 'DroidScript Premium' to edit more than 3 files" );
        return;
    }
    
    if( layEdit.IsVisible() ) SaveFile();
    LoadFile( curProgram, item );
}

//Handle file options.
function lstFiles_OnLongTouch( item )
{
    //Show options dialog.
    var sOps = T("Delete"); 
    lstOps = app.CreateListDialog( T("Actions"), sOps, "ShowNow" );
    lstOps.SetOnTouch( lstFileOps_Select ); 
    curLongTouchFile = item;
}

//Handle file option selection.
function lstFileOps_Select( item )
{
    if( item==T("Delete") )
       app.DeleteFile( appPath+"/"+curProgram+"/"+ curLongTouchFile );
        
    //Refresh files list.
    lstFiles.SetList( GetFilesList() );
    
    if( curLongTouchFile==curFileTitle ) 
        LoadFile( curProgram );
}

//Save user's changes if dirty flag set.
function SaveFile()
{
	if( dirty ) 
	{
		var txt = edit.GetText();
		txt = txt.replace( RegExp( "\u00A0","gim"), " " ); //Replace nbsp with normal space.
		app.WriteFile( appPath+"/"+curProgram+"/"+ curFileTitle, txt );
		dirty = false;
    }
    lastCursorPos[curFileTitle] = edit.GetCursorPos();
}

//Load a file to editor.
function LoadFile( progName, file )
{
    //If no file name specified.
    if( !file ) 
    {
    	//Check for html app.
    	var htmfile = appPath+"/"+progName+"/"+progName+".html"
    	if( app.FileExists( htmfile ) ) isHtml = true;
    	else isHtml = false;
    	
    	//Check for Espruino app.
    	if( app.FileExists( appPath+"/"+progName+"/.espruino" ) ) {
    	    btnDbg.SetText( "[fa-desktop]" );
    	    btnNew.Gone(); btnAsset.Gone();
    	    isEspruino = true;
    	}
    	else {
    	    btnDbg.SetText( "[fa-bug]" );
    	    btnNew.Show(); btnAsset.Show();
    	    isEspruino = false;
    	}
    	
    	//Set file name.
        file = progName + (isHtml?".html":".js");
        curProgTitle = file;
    }
	
    //Load code.
    var txt = app.ReadFile( appPath+"/"+progName+"/"+file );
    curFileTitle = file;
    
    //Load code and show file selector.
    edit.SetHtml( txt );
    edit.Focus();
    
    //Set editor language
    var ext = file.substr( file.lastIndexOf(".") ).toLowerCase();
    edit.SetLanguage( ext );
    
    //Show current file.
    btnFiles.SetText( curFileTitle );
    lstFiles.SetList( GetFilesList() );
    btnFiles.Show();
    
    //Clear history if program has changed.
    if( lastProg!=file ) edit.ClearHistory();
    lastProg = file;
    
    //Reset cursor position.
    edit.SetCursorPos( lastCursorPos[curFileTitle] );
    
    if( !layEdit.IsVisible() ) 
    {
        //Animate flip and start change watch timer.
        layFlip.Animate( "Flip", null, 350  );    
        timer = setTimeout( "CheckForChanges()", 1000 );
    
        //Show info bar and start code completion.
        setTimeout( "layInfo.SetVisibility('Show')", 250 );
        setTimeout( "ResizeCodingMenus()", 300 );
        ccTimer = setInterval( CheckForCodeSuggestions, 500 );
    }
}


//Called when program long click option chosen.
function lstOps_Select( item, noSetCols )
{
    if( item==T("Edit") )
    {
	    LoadFile( curProgram );
        if( tipCount++ < 4 ) app.ShowPopup( "Double tap yoyo for copy/paste", "long" );
    }
    else if( item==T("Rename") ) {
        ShowTextDialog( T("RenameApp"), curProgram, null, "OnRename" );
    }
    else if( item==T("Copy") ) {
        ShowTextDialog( T("CopyApp"), curProgram+" Copy", null, "OnCopy" );
    }
    else if( item==T("Delete") ) 
    {
        yesNo = app.CreateYesNoDialog( T("DeleteSure") + " '" + curProgram + "' ?" );
        yesNo.SetOnTouch( yesNoDelete_OnTouch );
        yesNo.Show();
    }
    else if( item==T("CreateShortcut") )
    {
		var file = appPath+"/"+curProgram+"/Img/"+curProgram+".png";
		if( !app.FileExists( file ) ) file = "/assets/Img/Icon.png";
		var extraOps = ""; if( HasOption("transparent") ) extraOps = "transparent";
		if( HasOption("nodom") ) extraOps += extraOps?",":"" + "nodom";
        app.CreateShortcut( curProgram, file, appPath+"/"+curProgram+"/"+curProgram+".js", extraOps );
    }
    else if( item==T("ShareSPK") )
    {
		CreatePackage( curProgram, tempFldr );
		var file = tempFldr+"/"+curProgram+".spk";
		app.SendFile( file, curProgram+".spk", "Check out my awesome DroidScript App!\n\nwww.droidscript.org", "Share SPK" );
    }
    else if( item==T("SaveSPK") )
    {
        app.MakeFolder( "/sdcard/DroidScript/SPKs" );
		CreatePackage( curProgram, "/sdcard/DroidScript/SPKs" );
		var msg = "SPK created in folder:\n\n /DroidScript/SPKs";
		app.ShowPopup( msg );
    }
    else if( item==T("BuildAPK") )
    {
		var privDir = app.GetPrivateFolder( "Plugins" );
        var plgFile = privDir+"/apkbuilder/ApkBuilder.jar";
        if( app.FileExists(plgFile) && ( purchases["plugin_apkbuilder"] || premium ) )
            ShowAPKDialog();
        else 
            app.Alert( T("APKPluginRequired"), T("BuildAPK"), "", "#bb000000" );
    }
}

//Handle delete 'are you sure' dialog.
function yesNoDelete_OnTouch( result )
{
    if( result=="Yes" ) {
        //Delete the file and refresh list.
        app.DeleteFolder( appPath+"/" + curProgram );
        //lst.SetList( GetProgramList(), "," );
        ShowIcons();
    }
}

//Called after user enters renamed program.
function OnRename( name )
{
    //Check if already exists.
    var fldr = appPath+"/"+name;
    if( app.FolderExists( fldr ) ) {
        app.Alert( "App already exists!" );
    }
    else {
        //Rename the .js file.
        var oldfile = appPath+"/"+curProgram+"/"+curProgram+".js";
        var newfile = appPath+"/"+curProgram +"/"+name+".js";
        if( app.FileExists( oldfile ) ) app.RenameFile( oldfile, newfile );
        
        //Rename the .html file.
        oldfile = appPath+"/"+curProgram+"/"+curProgram+".html";
        newfile = appPath+"/"+curProgram +"/"+name+".html";
        if( app.FileExists( oldfile ) ) app.RenameFile( oldfile, newfile );
        
        //Rename folder and refresh list.
        app.RenameFile( appPath+"/"+curProgram, appPath+"/"+name );
        ShowIcons();
    }
}

//Called after user enters copied program.
function OnCopy( name )
{
    //Check if already exists.
    var fldr = appPath+"/"+name;
    if( app.FolderExists( fldr ) ) {
        app.Alert( "App already exists!" );
    }
    else {
        //Copy folder.
        app.CopyFolder( appPath+"/"+curProgram, appPath+"/"+name );
        
        //Rename the .js file.
        var oldfile = appPath+"/"+name+"/"+curProgram+".js";
        var newfile = appPath+"/"+name +"/"+name+".js";
        if( app.FileExists( oldfile ) ) app.RenameFile( oldfile, newfile );
        
        //Rename the .html file.
        oldfile = appPath+"/"+name+"/"+curProgram+".html";
        newfile = appPath+"/"+name +"/"+name+".html";
        if( app.FileExists( oldfile ) ) app.RenameFile( oldfile, newfile );
        
        //Refresh list.
        ShowIcons();
    }
}

//Called after user enters new program name.
function OnAdd( name, type )
{
	//Check up name.
	if( !isValidFileName(name) ) {
		alert( "Name contains invalid characters!" );
		ShowTextDialog( "New App", "", "Native,HTML,Espruino", "OnAdd" );
		return;
	}
    var fldr = appPath+"/"+name;
    if( app.FolderExists( fldr ) ) {
        app.Alert( "App already exists!" );
    }
    else 
    {
        app.MakeFolder( fldr );
        
        if( type.indexOf("Espruino")<0 ) {
            app.MakeFolder( fldr+"/Img" );
            app.MakeFolder( fldr+"/Snd" );
            app.MakeFolder( fldr+"/Html" );
        }
        else app.WriteFile( fldr+"/.espruino", "" );
        
        if( type.toLowerCase()=="html" ) {
            var prog = app.ReadFile( "/Sys/Html/Template.html" );
            app.WriteFile( fldr+"/"+name+".html", prog );
        }
        else if( type.indexOf("Espruino")>-1) {
            var js = "\nfunction onInit()\n{\n  digitalWrite( LED1, true );\n}\n";
            app.WriteFile( fldr+"/"+name+".js", js );
            isEspruino = true;
        }
        else {
            var prog = app.ReadFile( "/Sys/samples/Template.js" );
            app.WriteFile( fldr+"/"+name+".js", prog );
        }
        
        //Refresh list.
        ShowIcons();
    }
}

function isValidFileName(str){
 return !/[`!#$%\^&*+=\[\]\\';,/{}|\\":<>\?]/g.test(str);
}

//Handle code changes.
function edit_OnChange()
{
    textChanged = true;
    dirty = true;
    edit.HighlightLine( -1 );
}

//Handle special key combos (physical keyboard).
function edit_OnKey( state, name, code, mods )
{
    //console.log( state + " " + name + " " + mods );
    var ctrl = mods.indexOf("Ctrl")>-1;
    var shift = mods.indexOf("Shift")>-1;
    
    if( state=="Up" && ctrl )
    {
        if( name=="F" || name=="H" ) 
        {
            srchBtn_OnTouchDown();
            edtSrch.Focus();
            var txt = edit.GetSelectedText();
            if( txt ) edtSrch.SetText( txt );
        }
        if( name=="K" )
        {
            var txt = edit.GetSelectedText();
            edit.Search( txt, shift ? "Back" : "Forward" );
        }
        else if( name=="I" ) {
            infoBtn_OnTouchDown();
            lstCC.Focus();
        }
        else if( name=="S" ) SaveFile();
        else if( name=="SPACE" ) btnExec_OnTouch();
        
        else if( name=="O" ) 
        {
            btnFiles_OnTouch();
            lstFiles.Focus();
        }
    }
}


//Check for change in current line posn.
function CheckForChanges()
{
    if( textChanged ) {
        var line = edit.GetCursorLine();
        if( lastLine != line ) SetEditorColours();
        lastLine = line;
    }
    //xx timer = setTimeout( "CheckForChanges()", 500 );
}

//Do syntax highlighting in editor.
function SetEditorColours()
{
	return; //xx
    var txt = edit.GetText();
	txt = SetColours( txt );
    edit.SetHtml( txt );
    textChanged = false;
}

//Do syntax highlighting on a string.
//(also replace newlines with page breaks etc)
function SetColours( txt, isHtml )
{
	return txt; //xx
	
	txt = txt.replace( RegExp( "&","gim"), "&amp;" );
	txt = txt.replace( RegExp( "<","gim"), "&lt;" );
    txt = txt.replace( RegExp( ">","gim"), "&gt;" );
    txt = txt.replace( RegExp( " ","gim"), "&nbsp;" );
    //txt = txt.replace( RegExp("(//.*?)$","gim"), "<font face='Arial' color='#008800'>$1</font>" );
    txt = txt.replace( RegExp("(^|;|\\s)(//.*?)$","gim"), "$1<font face='Arial' color='#008800'>$2</font>" );
    
    txt = txt.replace( RegExp("(&lt;html&gt;)","gim"), "<font face='Arial' color='#0000aa'>$1</font>" );
    txt = txt.replace( RegExp("(&lt;/html&gt;)","gim"), "<font face='Arial' color='#0000aa'>$1</font>" );
    txt = txt.replace( RegExp("(&lt;head&gt;)","gim"), "<font face='Arial' color='#0000aa'>$1</font>" );
    txt = txt.replace( RegExp("(&lt;/head&gt;)","gim"), "<font face='Arial' color='#0000aa'>$1</font>" );
     txt = txt.replace( RegExp("(&lt;style&gt;)","gim"), "<font face='Arial' color='#0000aa'>$1</font>" );
    txt = txt.replace( RegExp("(&lt;/style&gt;)","gim"), "<font face='Arial' color='#0000aa'>$1</font>" );
    txt = txt.replace( RegExp("(&lt;body.*?&gt;)","gim"), "<font face='Arial' color='#0000aa'>$1</font>" );
    txt = txt.replace( RegExp("(&lt;/body&gt;)","gim"), "<font face='Arial' color='#0000aa'>$1</font>" );
    txt = txt.replace( RegExp("(&lt;script.*?&gt;)","gim"), "<font face='Arial' color='#0000aa'>$1</font>" );
    txt = txt.replace( RegExp("(&lt;/script&gt;)","gim"), "<font face='Arial' color='#0000aa'>$1</font>" );
    txt = txt.replace( RegExp("(&lt;meta.*?&gt;)","gim"), "<font face='Arial' color='#0000aa'>$1</font>" );
    
    txt = txt.replace( RegExp( "\\n","gim"), "<br>" );
	return txt;
}

//Handle run button during code edit.
function btnExec_OnTouch()
{
    //Save user's changes.
    SaveFile();
    
    //Execute sample program in it's own process.
    isSample = false;
    isWebIDE = false;
    LaunchApp( curProgram, "", "remote" );
}

//Handle debug button during code edit.
function btnDbg_OnTouch()
{
    if( isEspruino) 
    {
        _LoadScriptSync( "/Sys/esp.js" )
        _LoadScriptSync( "/Sys/term.js" )
        if( !espruino ) espruino = new Espruino();
        if( !term ) term = new Terminal( espruino );
        
        term.Toggle();
        espruino.Connect();
        return;
    }
    
    //Save user's changes.
    SaveFile();
    
    //Execute sample program in it's own process.
    isSample = false;
    isWebIDE = false;
    LaunchApp( curProgram, "", "debug,overlay" );
}

//Handle undo key.
function btnUndo_OnTouch()
{
    edit.Undo();
}

//Handle redo key.
function btnRedo_OnTouch()
{
    edit.Redo();
}

//Handle assets key.
function btnAsset_OnTouch()
{
    ShowAssetsDialog();
}

//Handle new file button
function btnNew_OnTouch()
{
    //Check premium feature.
    var numFiles = GetFilesList().length;
    if( numFiles > 2 && !premium ) {
        alert( "Please upgrade to 'DroidScript Premium' to edit more than 3 files" );
        return;
    }
    ShowTextDialog( "New File", "", "Script,Text,HTML,CSS,JSON", "OnNew" );
}


//Called after user chooses to create a new file.
function OnNew( name, type )
{
    //Check up name.
	if( !isValidFileName(name) ) {
		alert( "Name contains invalid characters!" );
		ShowTextDialog( "New File", "", "Script,Text,HTML,CSS,JSON", "OnNew" );
		return;
	}
	
    //Build file name.
    type = type.toLowerCase();
    if( name.indexOf(".")==-1 ) name = name+"."+type;
    name = name.replace(".script",".js");
    name = name.replace(".text",".txt");
	
	//Create new file.
    var file = appPath+"/"+curProgram+"/"+name;
    if( app.FileExists( file ) )
        app.Alert( "File already exists!" );
    else {
        var prog = "";
        if( type=="html" ) prog = app.ReadFile( "/Sys/Html/Template.html" );
        app.WriteFile( file, prog );
    }
    //Refresh files list.
    lstFiles.SetList( GetFilesList() );
    
    SaveFile();
    LoadFile( curProgram, name );
}

//Handle Docs button press.
function btnDocs_OnTouch()
{
    app.Vibrate( "0,10" );
    app.HideKeyboard( true );
    
    if( laySamp.GetVisibility()=="Show" )  {
        laySamp.Animate( "SlideToRight", OnDoneAnimate );
        btnSamp.SetText( "[fa-rocket]" );
    }        
    
    if( layDoc.GetVisibility()=="Hide" ) { 
        layDoc.Animate( "SlideFromLeft", OnDoneAnimate );
        btnDocs.SetText( "<<" );
        SetMenus( "Exit:Exit.png", "/assets/Img" );
        HideCodingMenus();
        if( btnFiles.IsVisible() ) btnFiles.Hide(); 
        if( layFile.IsVisible() ) layFile.Hide();
    }
    else {
        layDoc.Animate( "SlideToLeft", OnDoneAnimate );    
        btnDocs.SetText( "[fa-book]" );
        SetMenus( "New:Add.png,Connect:Connect.png,Exit:Exit.png", "/assets/Img" );
        edit.Focus();
        
        //Show info bar and start code completion if editing.
        if( layEdit.GetVisibility()=="Show" ) {
            setTimeout( "layInfo.SetVisibility('Show')", 250 );
            ccTimer = setInterval( CheckForCodeSuggestions, 500 );
            btnFiles.Show();
        }
    }        
}
 
//Handle Samples button press.
function btnSamp_OnTouch()
{
    app.Vibrate( "0,10" );
    app.HideKeyboard( true );
    
    if( layDoc.GetVisibility()=="Show" ) {
        layDoc.Animate( "SlideToLeft", OnDoneAnimate );    
        btnDocs.SetText( "[fa-book]" );
    }       
    
    if( laySamp.GetVisibility()=="Hide" ) 
    { 
        laySamp.Animate( "SlideFromRight", OnDoneAnimate );  
        btnSamp.SetText( ">>" ); 
        SetMenus( "Exit:Exit.png", "/assets/Img" );  
        HideCodingMenus();
        editSamp.Focus();
        if( btnFiles.IsVisible() ) btnFiles.Hide(); 
        if( layFile.IsVisible() ) layFile.Hide();
    }
    else {
        laySamp.Animate( "SlideToRight", OnDoneAnimate );
        btnSamp.SetText( "[fa-rocket]" );
        SetMenus( "New:Add.png,Connect:Connect.png,Exit:Exit.png", "/assets/Img" );
        edit.Focus();
        
        //Show info bar and start code completion if editing.
        if( layEdit.GetVisibility()=="Show" ) 
        {
            setTimeout( "layInfo.SetVisibility('Show')", 250 );
            ccTimer = setInterval( CheckForCodeSuggestions, 500 );
            btnFiles.Show();
        }
        else if( layCopy.GetVisibility()=="Show" )
            layCopy.Animate( "SlideToRight" );
    }            
}

//Called when animation is finished.
function OnDoneAnimate( type )
{
    if( layEdit.GetVisibility()=="Show" ) 
        if( layCopy.GetVisibility()=="Show" )
             edit_OnDoubleTap( true );
}    

//Called when samples list item is selected.   
function lstSamp_OnTouch( item, body, type )
{
    //Get item name and type.
    curSample = item.split(":")[0];
    curSampType = type;
    
    //Check for premium samples.
    if( curSample.indexOf("&#9830;")>-1 ) {
        app.ShowPopup( "Please upgrade to 'DroidScript Premium' to access this sample" );
        return;
    }
        
    //Remote IOIO bit on front.
    curSample = curSample.replace( RegExp( "IOIO ","gim"), "" );
        
    //Replace spaces with underscores (for ICS assets).
    curSample = curSample.replace( RegExp( " ","gim"), "_" );
    
    //Load sample code.
    sampPath = "/assets/samples/";
    if( app.Language2Code() != "en" ) sampPath = docsPath + "/samples/";
    sampFile = sampPath + curSample + (curSampType=="x"?".js":".html");
    sampCode = app.ReadFile( sampFile );
    sampCode = SetColours( sampCode, curSampType=="h" );
    editSamp.SetText( sampCode );
    
    layEditSamp.SetVisibility( "Show" );
    editSamp.Focus();
    
    if( tipCount++ < 4 ) app.ShowPopup( "Press Back to return to list", "Short" );
}
   
//Called when samples list item is long pressed.   
function lstSamp_OnLongTouch( item )
{
}

//Handle running of samples.
function btnRun_OnTouch()
{
    //Execute sample program in it's own process.
    isSample = true;
    //app.StartApp( "/assets/samples/"+curSample+".js", "remote" );
    app.StartApp( sampFile, "remote" );
}

//Handle copy of samples.
function btnCopy_OnTouch()
{
    app.SetClipboardText( editSamp.GetText() );
    app.ShowPopup( "Sample copied to clipboard" );
}

//Handle code zoom in button.
function btnZoomIn_OnTouch()
{
    if( textSize <= 18 ) textSize += 2;
    editSamp.SetTextSize( textSize );
}

//Handle code zoom out button.
function btnZoomOut_OnTouch()
{
    if( textSize >= 10 ) textSize -= 2;
    editSamp.SetTextSize( textSize );
}

//Show the settings dialog.
function ShowSettings()
{
    //Create dialog window.
    dlgSet = app.CreateDialog( T("Settings") );
    dlgSet.SetBackColor( "#bb000000" );
    
    //Create a scroller and layout.
    var scrollSet = app.CreateScroller();
    dlgSet.AddLayout( scrollSet );
    laySet = app.CreateLayout( "linear", "vertical,Center,FillXY" );
    if( orient=="Portrait" ) laySet.SetSize( 0.85, 0.75 );
    else laySet.SetSize( 0.6, 0.9 );
    scrollSet.AddChild( laySet );
    //laySet.SetPadding( 0.2, 0.02, 0.2, 0.02 );
    
    //Create device name edit box.
    edtSetName = app.CreateTextEdit( deviceName, 0.4 );
    //edtSetName.SetMargins( 0.1, 0, 0.1, 0 );
    edtSetName.SetHint( T("DeviceName") );
    laySet.AddChild( edtSetName );
    
    //Create language spinner.
    spinLang = app.CreateSpinner( "English,Español,Português", 0.4 );
    spinLang.SelectItem( language );
    spinLang.SetMargins( 0, 0.01, 0, 0 );
    spinLang.SetOnChange( spinLang_OnChange );
    laySet.AddChild( spinLang );
  
    //Create text size spinner.
    laySet2 = app.CreateLayout( "linear", "horizontal,center" );
    laySet2a = app.CreateLayout( "linear", "vertical" );
    txtSet = app.CreateText( T("FontSize"), 0.2 );
    txtSet.SetMargins( 0, 0.01, 0, 0 );
	laySet2a.AddChild( txtSet );
	spTextSize = app.CreateSpinner( "6,7,8,9,10,11,12,13,14,15,16,18" );
	//spTextSize.SetSize( 0.3, -1 );
	spTextSize.SetText( textSize );
	laySet2a.AddChild( spTextSize );
	laySet2.AddChild( laySet2a );
	
	//Create ADB checkbox.
	chkSetAdb = app.CreateCheckBox( T("Use")+" ADB" );
	chkSetAdb.SetMargins( 0, 0.04, 0, 0 );
	laySet2.AddChild( chkSetAdb );
	chkSetAdb.SetChecked( useADB );
	laySet.AddChild( laySet2 );
	
	//Create horizontal layout.
	var layHoriz = app.CreateLayout( "linear", "horizontal,center" );
	laySet.AddChild( layHoriz );
	
	//Create Use SoftKeys checkbox.
	chkSetSoftKeys = app.CreateCheckBox( T("Use")+" SoftKeys" );
	chkSetSoftKeys.SetMargins( 0, 0.02, 0, 0 );
	chkSetSoftKeys.SetChecked( useSoftKeys );
	layHoriz.AddChild( chkSetSoftKeys );
	
	//Create Use Yoyo checkbox.
	chkSetYoyo = app.CreateCheckBox( T("Use")+" Yoyo" );
	chkSetYoyo.SetMargins( 0, 0.02, 0, 0 );
	chkSetYoyo.SetChecked( useYoyo );
	layHoriz.AddChild( chkSetYoyo );
	
	//Create horizontal layout.
	var layHoriz = app.CreateLayout( "linear", "horizontal,center" );
	laySet.AddChild( layHoriz );
	
	//Create Stay Awake checkbox.
	chkStayAwake = app.CreateCheckBox( T("StayAwake") );
	chkStayAwake.SetMargins( 0, 0.02, 0, 0 );
	chkStayAwake.SetChecked( stayAwake );
	layHoriz.AddChild( chkStayAwake );
	
	//Create Auto-help checkbox.
	chkAutoHelp = app.CreateCheckBox( "Auto-Help" );
	chkAutoHelp.SetMargins( 0, 0.02, 0, 0 );
	chkAutoHelp.SetChecked( autoHelp );
	layHoriz.AddChild( chkAutoHelp );
	
    //Create Use DarkTheme checkbox. 
    chkSetDarkTheme = app.CreateCheckBox( T("DarkTheme") ); 
    chkSetDarkTheme.SetMargins( 0, 0.02, 0, 0 ); 
    chkSetDarkTheme.SetChecked( useDarkTheme ); 
    laySet.AddChild( chkSetDarkTheme ); 
	
	//Create horizontal layout.
	var layHoriz = app.CreateLayout( "linear", "horizontal,center,vcenter" );
	laySet.AddChild( layHoriz );
	
	//Create Password checkbox.
	chkSetPass = app.CreateCheckBox( T("Use")+" "+T("Password" ) );
	chkSetPass.SetMargins( 0, 0.02, 0, 0 );
	layHoriz.AddChild( chkSetPass );
	chkSetPass.SetChecked( usePass );

    //Create password edit box.
    edtSetPass = app.CreateTextEdit( password, 0.3 );
    edtSetPass.SetMargins( 0.01,0.01,0,0 )
    edtSetName.SetHint( "Password" );
    layHoriz.AddChild( edtSetPass );
  
    //Create OK and Cancel buttons.
    laySet3 = app.CreateLayout( "linear", "horizontal,fillxy,center" );
    laySet3.SetMargins( 0, 0.03, 0, 0.01 );  
    btnSetOK = app.CreateButton( "OK", 0.24 );
    btnSetOK.SetOnTouch( btnSetOK_OnTouch );
    laySet3.AddChild( btnSetOK );
    btnSetCancel = app.CreateButton( "Cancel", 0.24 );
    btnSetCancel.SetOnTouch( btnSetCancel_OnTouch );
    laySet3.AddChild( btnSetCancel );
    laySet.AddChild( laySet3 );

    //Show dialog.
    dlgSet.Show();
}

//Handle settings 'OK' click.
function btnSetOK_OnTouch()
{
    //Save settings.
    deviceName = edtSetName.GetText();
    app.SaveText( "DeviceName", deviceName );
    
    language = spinLang.GetText();
    app.SaveText( "Language", language );
    SetLanguage();
    
	textSize = parseInt(spTextSize.GetText());
	app.SaveNumber( "TextSize", textSize ); 
	edit.SetTextSize( textSize );
	editSamp.SetTextSize( textSize );
	
	useADB = chkSetAdb.GetChecked();
	app.SaveBoolean( "UseADB", useADB );
	
	useSoftKeys = chkSetSoftKeys.GetChecked();
	app.SaveBoolean( "UseSoftKeys", useSoftKeys );
	edit.SetUseKeyboard( useSoftKeys );
	
	useYoyo = chkSetYoyo.GetChecked();
	app.SaveBoolean( "UseYoyo", useYoyo );
	edit.SetNavigationMethod( useYoyo ? "Yoyo" : "Touch" );
	editSamp.SetNavigationMethod( useYoyo ? "Yoyo" : "Touch" );
	
	autoHelp = chkAutoHelp.GetChecked();
	app.SaveBoolean( "AutoHelp", autoHelp );
	
	stayAwake = chkStayAwake.GetChecked();
	app.SaveBoolean( "StayAwake", stayAwake );
	if( stayAwake ) app.PreventScreenLock( "Full" );
	else app.PreventScreenLock( "None" );
	
	var dark = chkSetDarkTheme.GetChecked(); 
	var themChange = (dark != useDarkTheme);
	useDarkTheme = dark;
    app.SaveBoolean( "UseDarkTheme", useDarkTheme ); 
    edit.SetColorScheme( useDarkTheme ? "Dark" : "Light" );
    layLst.SetBackground( useDarkTheme ? "/res/drawable/android_dark" : "/res/drawable/android" );
	
	usePass = chkSetPass.GetChecked();
	app.SaveBoolean( "UsePass", usePass );
	password = edtSetPass.GetText();
	app.SaveText( "Password", password );
	
    //Remove dialog and relist apps.
    dlgSet.Dismiss();
    if( themChange ) ShowIcons();
}

//Handle settings 'Cancel' click.
function btnSetCancel_OnTouch()
{
    dlgSet.Dismiss();
}

//Handle language spinner.
function spinLang_OnChange()
{
    var lang = spinLang.GetText();
    if( lang=="English" ) return;
    
    //Check if language already installed.
    var code = "-" + app.Language2Code( lang );
    docsPath = "/sdcard/DroidScript/.edit/docs" + code;
    if( app.FolderExists(docsPath) && !app.IsNewVersion() ) return;
    
    //Download language plugin if required.
    var plugName = lang.toLowerCase()+"-lang";
    //plugName = "español-lang";
    InstallPlugin( plugName );
}

//Generic text input dialog function.
function ShowTextDialog( title, deflt, choice, callback )
{
    _dlgTxt = this;
    this.callback = callback;
    this.choice = choice;

    //Create dialog window.
    dlgTxt = app.CreateDialog( title );
    dlgTxt.SetBackColor( "#bb000000" );
    layTxtDlg = app.CreateLayout( "linear", "vertical,fillxy" );
    layTxtDlg.SetPadding( 0.04, 0.02, 0.04, 0 );

    //Create dialog controls.
    txtTxtDlg = app.CreateTextEdit( deflt, 0.6, -1, "Left,SingleLine" );
    //txtTxtDlg.SetBackColor( "#ffffffff" );
    layTxtDlg.AddChild( txtTxtDlg );
    
    if( choice ) {
        spinTxt = app.CreateSpinner( choice, 0.6 );
        spinTxt.SetMargins( 0, 0.02, 0, 0.01 ); 
        layTxtDlg.AddChild( spinTxt );
    }
    layTxtDlg2 = app.CreateLayout( "linear", "horizontal,fillxy,center" );
    layTxtDlg2.SetMargins( 0, 0.02, 0, 0.01 );  
    btnTxtOK = app.CreateButton( "OK", 0.24, -1, "" );
    btnTxtOK.SetOnTouch( _dlgTxt_OnOk );
    layTxtDlg2.AddChild( btnTxtOK );
    btnTxtCancel = app.CreateButton( "Cancel", 0.24, -1, "" );
    btnTxtCancel.SetOnTouch( _dlgTxt_OnCancel );
    layTxtDlg2.AddChild( btnTxtCancel );
    layTxtDlg.AddChild( layTxtDlg2 );

    //Add dialog layout and show dialog.
    dlgTxt.AddLayout( layTxtDlg );
    dlgTxt.Show();
}

function _dlgTxt_OnCancel() { dlgTxt.Dismiss(); }

function _dlgTxt_OnOk() { 
    dlgTxt.Dismiss(); 
    var txt = txtTxtDlg.GetText();
    var type = ( _dlgTxt.choice ? spinTxt.GetText() : null );
    if( txt ) eval( _dlgTxt.callback + "(\"" + 
        txtTxtDlg.GetText() + "\",\"" + type + "\")" ); 
}


//Show about box.
function ShowAbout()
{
    //Create dialog window.
    dlgAbout = app.CreateDialog( T("About") + " DroidScript" );
    if( !isChrome ) dlgAbout.SetBackColor( "#bb000000" );
    if( orient=="Portrait" ) dlgAbout.SetSize( 0.7, 0.65 );
    else dlgAbout.SetSize( isChrome?0.3:0.4, isChrome?0.7:0.98 );
	
    //Create layout.
    layAboutDlg = app.CreateLayout( "linear", "vertical,fillxy" );
    //layAbout.SetPadding( 0.2, 0, 0.2, 0.06 );
    
    //Create scroller.
	var scroll = app.CreateScroller();
	//scroll.SetMargins( 0.05, 0, 0.05, 0 );
	layAboutDlg.AddChild( scroll );
	
	//Create layout inside scroller.
    var layAbout = app.CreateLayout( "linear", "vertical,fillxy" );
    scroll.AddChild( layAbout );

    //Create image at top.
    var img = app.CreateImage( "/Res/drawable/icon", isChrome?0.07:(isPortrait?0.18:0.08), -1, "" );
    img.SetMargins( 0, 0.02, 0, 0.02 );
    layAbout.AddChild( img );
    
    //Show version.
    var ver = app.GetVersion();
    var s = "Version "+ver+ (g_tester?" (Beta Tester)":"");
    var txt = app.CreateText( s );
    txt.SetTextSize( isChrome?8:12 );
    if( !isChrome ) txt.SetTextColor("#ffffff");
    layAbout.AddChild( txt );
    
    //Show IP address.
    var txtIP = app.CreateText( app.GetIPAddress() );
    txtIP.SetTextSize( isChrome?8:12 );
    if( !isChrome ) txtIP.SetTextColor("#ffffff");
    layAbout.AddChild( txtIP );
    
    //Create forum link.
    var txtForum = app.CreateText( "" );
    txtForum.SetMargins( 0, 0.03, 0,0 );
    txtForum.SetTextSize( isChrome?11:16 );
    txtForum.SetTextColor("#56AEF2");
    txtForum.SetHtml( "<u>"+T("Group")+"</u>" );
    txtForum.SetOnTouchDown( txtForum_OnTouchDown );
    layAbout.AddChild( txtForum );
    
    //Create twitter link.
    var txtTwitter = app.CreateText( "" );
    txtTwitter.SetMargins( 0, 0.03, 0,0 );
    txtTwitter.SetTextSize( isChrome?11:16 );
    txtTwitter.SetTextColor("#56AEF2");
    txtTwitter.SetHtml( "<u>Twitter</u>" );
    txtTwitter.SetOnTouchDown( txtTwitter_OnTouchDown );
    layAbout.AddChild( txtTwitter );
    
    //Create Facebook link.
    var txtFacebook = app.CreateText( "" );
    txtFacebook.SetMargins( 0, 0.03, 0,0 );
    txtFacebook.SetTextSize( isChrome?11:16 );
    txtFacebook.SetTextColor("#56AEF2");
    txtFacebook.SetHtml( "<u>Facebook</u>" );
    txtFacebook.SetOnTouchDown( txtFacebook_OnTouchDown );
    layAbout.AddChild( txtFacebook );
    
    //Create Privicy policy link.
    var txtPrivacy = app.CreateText( "" );
    txtPrivacy.SetMargins( 0, 0.03, 0,0 );
    txtPrivacy.SetTextSize( isChrome?11:16 );
    txtPrivacy.SetTextColor("#56AEF2");
    txtPrivacy.SetHtml( "<u>"+T("PrivacyPolicy")+"</u>" );
    txtPrivacy.SetOnTouchDown( txtPrivacy_OnTouchDown );
    layAbout.AddChild( txtPrivacy );
    
    var btnLicenses = app.CreateButton("Licenses");
    btnLicenses.SetMargins( 0, 0.03, 0,0 );
    btnLicenses.SetTextSize( isChrome?10:16 );
    btnLicenses.SetOnTouch( btnLicenses_OnTouch );
    layAbout.AddChild( btnLicenses );   

    //Add dialog layout and show dialog.
    dlgAbout.AddLayout( layAboutDlg );
    dlgAbout.Show();
}

//Launch forum link.
function txtForum_OnTouchDown()
{
	app.OpenUrl( "http://groups.google.com/forum/#!forum/androidscript" );
}

//Launch twitter link.
function txtTwitter_OnTouchDown()
{
	app.OpenUrl( "http://twitter.com/android_script" );
}

//Launch Facebook link.
function txtFacebook_OnTouchDown()
{
	app.OpenUrl( "https://www.facebook.com/DroidScript" );
}

//Launch Privacy link.
function txtPrivacy_OnTouchDown()
{
	app.OpenUrl( "http://www.androidscript.org/Privacy/Privacy-Policy.html" );
}


// Show the license information
function btnLicenses_OnTouch()
{
    dlgLicense = app.CreateDialog("Licenses");
    if( !isChrome ) dlgLicense.SetBackColor( "#bb000000" );
    layLicense = app.CreateLayout( "Linear", "Vertical, FillXY" );
    layLicense.SetPadding( 0.025, 0, 0.025, 0 );
    
    // Android Trademark
    var licenseText = "<p>Android is a trademark of Google Inc.</p>";
    
    // Android Robot License
    licenseText += "<p>The Android robot is reproduced or modified from work created and shared " +
    " by Google and used according to terms described in the " +
    "<a href=http://creativecommons.org/licenses/by/3.0/>Creative Commons 3.0</a> " +
    "Attribution License.</p>";
    
    // Google Play Trademark
    licenseText += "<p>Google Play is a trademark of Google Inc.</p>";
    
    licenseText += "<p><b>DroidScript and the Wifi IDE make use of the following projects:</b></p>"
    
    // Jetty License
    licenseText += "<p><a href=http://www.eclipse.org/jetty/>Jetty Web Container</a> is " +
    "Copyright Mort Bay Consulting Pty Ltd, and licensed under the "+
    "<a href=http://www.apache.org/licenses/LICENSE-2.0.html>Apache 2.0 License</a>.</p>";
    
    // Font Awesome License
    licenseText += "<p><a href=http://fortawesome.github.io/Font-Awesome/>Font Awesome</a> by Dave Gandy " +
    "is licensed under the "+
    "<a href=http://scripts.sil.org/OFL>SIL OFL 1.1</a>.</p>";
    
    // Ace License
    licenseText += "<p><a href=http://ace.c9.io/>Ace</a> is Copyright Ajax.org B.V. " +
    "and licensed under the <a href=https://github.com/ajaxorg/ace/blob/master/LICENSE>BSD License</a>.</p>"
    
    // Bootstrap License
    licenseText += "<p><a href=http://getbootstrap.com/>Bootstrap</a> is Copyright Twitter Inc, and licensed " +
    "under the <a href=https://github.com/twbs/bootstrap/blob/master/LICENSE>MIT License</a>.</p>"
    
    // TextWarrior License
    licenseText += "<p><a href=http://sourceforge.net/projects/textwarrior>TextWarrior</a> is Copyright Tah Wei Hoon " +
    "and is licensed under the <a href=http://www.apache.org/licenses/LICENSE-2.0.html>Apache 2.0 License</a>.</p>";
  
    // jQuery and jQueryMobile
    licenseText += "<p><a href=http://jquery.com/>jQuery</a> and <a href=http://jquerymobile.com/>jQuery Mobile</a> "+
    "are Copyright The jQuery Foundation, licensed under <a href=https://jquery.org/license/>MIT License</a>.</p>";
    
    // Uglify License
    licenseText += "<p><a href=https://github.com/mishoo/UglifyJS>UglifyJS</a> is Copyright Mihai Bazon " +
    "and licensed under the <a href=https://github.com/mishoo/UglifyJS/blob/master/README.org#license>BSD License</a>.</p>";
    
    // jqPlot
    licenseText += "<p><a href=http://www.jqplot.com/>jqPlot</a> by Chris Leonello " +
    "is licensed under the <a href=http://opensource.org/licenses/MIT>MIT License</a>.</p>";
    
    // HTML5 Canvas Gauage
    licenseText += "<p><a href=https://github.com/Mikhus/canv-gauge>HTML5 Canvas Gauge</a> is Copyright Mykhailo Stadnyk " +
    "and licensed under the <a href=http://opensource.org/licenses/MIT>MIT License</a>.</p>";
       
    var txtLicense = app.CreateText( licenseText, isChrome?0.6:0.95, -1, "Html,Link,Left" );
    txtLicense.SetTextSize( isChrome?9:14 );
    layLicense.AddChild( txtLicense );
    
    //Add dialog layout and show dialog.
    dlgLicense.AddLayout( layLicense );
    dlgLicense.Show();
}

//Handle IDE commands (via jetty web service).
function OnIDE( cmd, param1, param2 )
{
	isWebIDE = true;
	g_debugParams = "remote";
	clearInterval( udpTimer );
	
    if( cmd=="refresh" ) {
        ShowIcons();
    }
    else if( cmd=="setprog" ) {
        console.log( "setprog:" + param1 );
        curProgram = param1;
    }
    else if( cmd=="run" ) {
		LaunchApp( param1, "" );
    }
    else if( cmd=="demo" )
    {
		app.WriteFile( tempFldr + "/~demo.js", unescape(param1) );
		app.StartApp( tempFldr + "/~demo.js" );	
    }
    else if( cmd=="execute" )
    {
		if( param1=="app" ) {
			app.WriteFile( tempFldr + "/~demo.js", unescape(atob(param2)) );
			app.StartApp( tempFldr + "/~demo.js" );	
		}
		else if( param1=="ide" ) {
			_SafeRun( unescape(atob(param2)) );
		}
		else if( param1=="usr" ) {
			app.Broadcast( "Exec", unescape(atob(param2)) );
		}
    }
    else if( cmd=="exec" )
    {
		var js = unescape(param1);
		if( js[0]=="?" ) {
			js = "console.log(" + js.substr(1) + ")";
			app.Broadcast( "Exec", js );
		}
		else if( js[0]=="$" ) 
		{ 
			var s = js.substr(1);
			if( s.trim()=="logcat" ) s = "logcat -t 100";
			
			var apps = JSON.stringify(app.GetRunningApps());
			if( apps.indexOf(":NewActivityProcess")>-1 ) { 
				js = "app.SysExec(\""+s+"\",\"log\",100,7)";
				app.Broadcast( "Exec", js );
			}
			else app.SysExec( s, "log", 100,7 );
		}
		else if( js[0]=="!" ) 
		{ 
			var apps = JSON.stringify(app.GetRunningApps());
			var newAct = apps.indexOf(":NewActivityProcess")>-1; 
			
			var cmd = js.substr(1).trim();
			if( cmd=="screenshot" ) {
				if( newAct ) app.Broadcast( "Exec", "app.ScreenShot(\"/sdcard/DroidScript/.edit/screenshot.jpg\")" );
				else app.ScreenShot( "/sdcard/DroidScript/.edit/screenshot.jpg" );
			}
		}
		else 
			app.Broadcast( "Exec", js );
		
    }
    else if( cmd=="sample" )
    {
        if( param1.indexOf("&#9830;")>-1 ) {
            app.ShowPopup( "Please upgrade to 'DroidScript Premium' to access this sample" );
            return;
        }
        
        isSample = true;
        var sampPath = "/assets/samples/";
        if( app.Language2Code() != "en" ) sampPath = docsPath + "/samples/";
	    app.StartApp( sampPath+param1+".js", "remote" );
    }
    else if( cmd=="downloadspk" )
    { 
		DownloadSPK( param1 );
    }
}

function OnIdeConnect( ip )
{
	if( ip.indexOf("127.0.0.1")<0 ) 
	{ 
		if( webAce ) webAce.Gone();
		if( layFront ) layFront.Gone();
		if( laySamp ) laySamp.Gone();
		if( layDoc ) layDoc.Gone();
		txtRemote.SetText( "[fa-wifi]  " + ip );
		txtRemote.Show()
	}
}

function OnIdeDisconnect( ip )
{
	if( ip.indexOf("127.0.0.1")<0 ) 
	{ 
		txtRemote.Gone();
		if( webAce ) webAce.Show();
		if( layFront ) layFront.Show();
	}
}

function DownloadSPK( url )
{
    spkUrl = decodeURIComponent( url );
    
    //Download spk file from web.
    dloadspk = app.CreateDownloader();
    dloadspk.SetOnComplete( dloadspk_OnComplete );
    dloadspk.SetOnError( dloadspk_OnError );
    dloadspk.Download( encodeURI(spkUrl), tempFldr );
}

//Handle demo download completion.
function dloadspk_OnComplete()
{
	spkTitle = spkUrl.substr( spkUrl.lastIndexOf("/")+1 );
	spkFile = tempFldr + "/" + spkTitle;
	var installDiag = app.CreateYesNoDialog( "Script Package Installer:\n\nDo you trust the source of "+spkTitle+"?" );
	installDiag.SetOnTouch( installDiag_OnTouch );
	installDiag.Show();
}

//Handle demo download errors.
function dloadspk_OnError()
{
	app.ShowPopup( "Download failed!" );
}

//Create a project package.
function CreatePackage( appName, destFldr )
{
    //Create project zip file.
    var zip = app.CreateZipUtil();
	var fldr = app.GetPath()+"/"+appName;
	var file = destFldr+"/"+appName+".spk";
	zip.Create( file );
	
	//Add project files.
    AddFolder( zip, appName, fldr );
	
	//Close zip file.
	zip.Close();
}

//Recursively add folder contents to zip.
function AddFolder( zip, name, fldr )
{
    var list = app.ListFolder( fldr,"");
    for( var i=0; i<list.length; i++ )
    {
        var title = list[i];
        if( !app.IsFolder( fldr+"/"+title ) )
            zip.AddFile( name+"/"+title.replace(".js",".js.txt"), fldr+"/"+title );
        else
            AddFolder( zip, name+"/"+title, fldr+"/"+title );
    }
}

//Check an spk package.
function CheckPackage( file )
{
    //Create zip util.
    zip = app.CreateZipUtil();
    zip.Open( file );
    
    //Get top level entry.
    var list = zip.List( "/" );
    zip.Close();
    
    //Check for valid package.
    if( !list ) { 
        app.ShowPopup("Invalid package!");
        return; 
    }
    //Check for overwrite.
    var lst = list.split(",");
    var fldr = app.GetPath();
    if( app.FolderExists( fldr+"/"+lst[0] ) ) {
        var overwriteDiag = app.CreateYesNoDialog( "Overwrite existing App?" );
        overwriteDiag.SetOnTouch( overwriteDiag_OnTouch );
        overwriteDiag.Show();
    }
    else {
		//Install package.
		InstallPackage( file );
		app.ShowPopup( "Package installed" );
		if( isChrome ) webAce.Execute( "refreshAppsList()" );
    }
}

//Handle overwrite spk dialog.
function overwriteDiag_OnTouch( result )
{
    if( result=="Yes" ) {
	    InstallPackage( spkFile );
	    app.ShowPopup( "Package installed" );
    }
	else
	    app.ShowPopup( "Package not installed" );
}

//Install an spk package.
function InstallPackage( file )
{
    //Create project zip file.
    var zip = app.CreateZipUtil();
    zip.Open( file );
    
    //Extract files and folders.
    var fldr = app.GetPath();
    ExtractFiles( zip, "/", fldr, true );
    
    //Close zip file.
	zip.Close();
	
	//Refresh icons.
	ShowIcons();
}

//Recursively extract zip contents.
function ExtractFiles( zip, path, fldr, isSpk )
{
    var list = zip.List( path );
    if( !list ) { app.ShowPopup("Invalid package!"); return; }
    
    app.MakeFolder( fldr );
    var lst = list.split(",");
    for( var i=0; i<lst.length; i++ )
    {
        var name = lst[i];
        if( name.indexOf("/")==-1) {
            zip.Extract( (path+name).substr(1), fldr+path+name.replace(".js.txt",".js") )
        }
        else {
            app.MakeFolder( fldr+(path+name).slice(0,-1) );
            ExtractFiles( zip, path+name, fldr, isSpk );
        }
    }
}

//Show the plugins dialog.
function ShowPlugins()
{
    //Create dialog window.
    dlgPlug = app.CreateDialog( "Plugins" );
    if( !isChrome ) dlgPlug.SetBackColor( "#bb000000" );
    layPlug = app.CreateLayout( "linear", "vertical,fillxy" );
    if( isPortrait ) layPlug.SetPadding( 0.03, 0.015, 0.03, 0.015 );
    else layPlug.SetPadding( 0.015, 0.03, 0.015, 0.03 );

    //Create a web control.
    webPlug = app.CreateWebView( isChrome?0.5:0.85, 0.65, "IgnoreErrors" );
    //webPlug.SetMargins( 0, 0.01, 0, 0.02 ); 
    webPlug.SetOnProgress( webPlug_OnProgess );
    layPlug.AddChild( webPlug );

    //Add dialog layout and show dialog.
    dlgPlug.AddLayout( layPlug );
    dlgPlug.Show();
    
    //Load page
    app.ShowProgress("Loading...");
    setTimeout( "app.HideProgress()", 7000 );
    if( g_tester ) webPlug.LoadUrl( "http://www.androidscript.org/PluginsTest/Plugins.html" );
    else webPlug.LoadUrl( "http://www.androidscript.org/Plugins/Plugins.html" );
}

//Show page load progress.
function webPlug_OnProgess( progress )
{
    if( progress==100 ) app.HideProgress();
}

//Check plugins are licensed.
function CheckLicenses()
{
    //Create Google Play object (if not done).
    if( !playStore ) playStore = app.CreatePlayStore();
    
    //Get user hash code.
    if( !crypt ) crypt = app.CreateCrypt();
	hashCode = crypt.Hash( app.GetUser(), "MD5" ); 
    
    if( app.IsEngine() ) premium = true;
    setTimeout( "playStore.GetPurchases(OnLicenses)", 1000 );
    setTimeout( GetPremiumStatus, 2000 );
}

//Save licenses.
function OnLicenses( items )
{
    for( var i=0; i<items.length; i++ )
        purchases[items[i].productId] = (items[i].purchaseState==0);
}

//Get prices from google play etc.
function UpdatePluginInfo( prodIDs, versions )
{
    //Store version info for each plugin.
    var pluginIDs = prodIDs.split(",");
    var vers = versions.split(",");
    for( var i=0; i<pluginIDs.length; i++ )
        pluginVersions[pluginIDs[i]] = parseFloat(vers[i]);
    
    //Get product info from Google Play.
    //(Only paid items will be listed in OnStoreInfo)
    playStore.GetBillingInfo( prodIDs, OnStoreInfo );
}

//Show Play Store prices.
function OnStoreInfo( items )
{
    //Show prices.
    for( var i=0; i<items.length; i++ )
    {
        var prodId = items[i].productId.replace(".","_").replace(".","_");
        var div = prodId+"_price";
        var price = items[i].price;
        webPlug.Execute( div+".innerHTML='"+price+"'" );
        if( premium ) {
            var btn = prodId+"_button";
            webPlug.Execute( "document.getElementById('"+btn+"').value='   Install   '" );
            CheckPluginVersion( prodId );
        }
    }
    
    //Set 'Buy/Reinstall/Update' button states.
    if( !premium ) playStore.GetPurchases( OnPurchases );
}

//Show Play Store item info.
function OnPurchases( items )
{
    for( var i=0; i<items.length; i++ )
    {
        var prodId = items[i].productId.replace(".","_").replace(".","_");
        if( !premium )
        {
            //Get appropriate button label.
            var btn = prodId+"_button";
            var label = ((items[i].purchaseState==0) ? "   Install   " : "    Buy    " );
            webPlug.Execute( "document.getElementById('"+btn+"').value='"+label+"'" );
        }
        
        //If purchased, check plugin version.
        if( items[i].purchaseState==0 ) {
			CheckPluginVersion( prodId );
        }
        
        //Save purchased items.
        purchases[items[i].productId] = (items[i].purchaseState==0);
    }
}

//Update version state of free plugins.
function UpdateFreePluginInfo( prodIDs, versions )
{
    //Check and update version for each plugin.
    var pluginIDs = prodIDs.split(",");
    var vers = versions.split(",");
    for( var i=0; i<pluginIDs.length; i++ ) 
    {
        pluginVersions[pluginIDs[i]] = parseFloat(vers[i]);    
		CheckPluginVersion( pluginIDs[i] );
	}
}

//Check if plugin is up-to-date.
function CheckPluginVersion( prodId )
{
	//Get local plugin version.
    var plgName = prodId.replace("plugin_","");
    var privDir = app.GetPrivateFolder( "Plugins" );
    var plgFile = privDir+"/"+plgName+"/Version.txt";
    var version = parseFloat( app.ReadFile( plgFile ));
    if( isNaN(version) ) return;
    
    //Get remote version.
    var versionRem = pluginVersions[prodId];
    var btn = prodId+"_button";
    
    //Compare with versions and change label if neccessary.
    if( version < versionRem ) {
		webPlug.Execute( "document.getElementById('"+btn+"').value='  Update  '" );
	}
	else 
	    webPlug.Execute( "document.getElementById('"+btn+"').value=' Reinstall '" );
}

//Handle Plugins 'Buy' from Plugins HTML page.
function BuyPlugin( prodId, gplay )
{
	//Show warning/license message.
	var txt = "NOTICE\n\n" + 
	    "Do agree that you will not hold droidscript.org" + 
		" or any holding companies responsible for damages or losses incurred due to the use of" +
		" this plugin.\n\n Do you agree?"
	yesNoBuy = app.CreateYesNoDialog( txt );
	yesNoBuy.SetOnTouch( yesNoBuy_OnTouch );
	yesNoBuy.prodId = prodId;
	yesNoBuy.gplay = gplay;
	yesNoBuy.Show();
}

//Handle accepting/rejecting plugin license.
function yesNoBuy_OnTouch( result )
{
	//Start the purchase process. 
	if( result=="Yes" )
		playStore.Purchase( yesNoBuy.prodId, "xbx345xbx", OnPurchased );
}

//Handle completed purchase.
function OnPurchased( prodId )
{
    //Update purchase state.
    purchases[prodId] = true;
    
    //alert( "OnPurchased" + prodId );
    //Install the plugin.
    InstallPlugin( prodId, yesNoBuy.gplay );
    
    //Update 'buy' button to 'Reinstall'.
    prodId = prodId.replace(".","_").replace(".","_");
    var btn = prodId+"_button";
    var label ="Reinstall";
    webPlug.Execute( btn+".value='"+label+"'" );
}

//Handle Plugins 'Install' from Plugins HTML page.
function InstallPlugin( prodId, gplay )
{
    //Get plugin name.
    plugName = prodId.replace("plugin_","");
    
    //Check for GooglePlay install method.
    if( gplay && gplay!='undefined' ) {
        app.OpenUrl( "market://details?id="+gplay );
    }
    else 
    {
        //Set plugin file urls.
        var url = "http://www.androidscript.org/Plugins/";
        if( g_tester )  url = "http://www.androidscript.org/PluginsTest/";
        var src = url + plugName + ".zip";
        
        //Set dest folder.
        var privDir = app.GetPrivateFolder( "Plugins" );
        plugDir = privDir+"/"+plugName;
        app.MakeFolder( plugDir );
        plugFile = plugDir + "/" + plugName + ".zip";
        
        //Download plugin files from web.
        dload = app.CreateDownloader();
        dload.SetOnComplete( dload_OnComplete );
        dload.SetOnError( dload_OnError );
        dload.Download( src, plugDir );
        
        //Update license info.
        CheckLicenses();
    }
}

//Handle Plugins 'OK' click.
function btnPlugOK_OnTouch()
{
    //Remove dialog.
    dlgPlug.Dismiss();
}

//Handle plugin download completion.
function dload_OnComplete()
{
    //Open plugin zip file.
    var zip = app.CreateZipUtil();
    zip.Open( plugFile );
    
    //Check if this is a language plugin.
    isLangPlugin = false;
    if( plugName.indexOf("-lang")>-1 ) {
        var code = app.Language2Code( plugName.replace("-lang","") );
        plugDir = "/sdcard/DroidScript/.edit/docs-"+code;
        isLangPlugin = true;
    }
    
    //Extract files and folders.
    ExtractFiles( zip, "/", plugDir );
    
    //Close zip file and delete it.
    zip.Close();
    app.DeleteFile( plugFile );
    
    //Re-list plugins.
    ListPlugins();
    
    if( isLangPlugin ) 
        app.ShowPopup( "Language installed", "Long" );
    else {
        //Extract plugin docs to .edit/docs folder (for wifi ide).
        var docsDir = appPath+"/.edit/docs/plugins/"+plugName;
        app.CopyFolder( plugDir, docsDir, true );
        app.ShowPopup( "Plugin installed. Please see Docs/Plugins for more information", "Long" );
    }
}

//Handle plulgin download errors.
function dload_OnError()
{
	app.ShowPopup( "Download failed!" );
}

//List plugins to prefs (for Wifi IDE).
function ListPlugins()
{
	var plugs = "";
	var fldr = app.GetPrivateFolder( "Plugins" );
	var list = app.ListFolder( fldr,"" );
	for( var i=0; i<list.length && list[0]!=""; i++ )
	{
		//Filter for folders.
		var plugName = list[i];
		if( app.IsFolder( fldr+"/"+plugName ) )
		{
			//Get case sensitive title of plugin from inc file.
			var incName = app.ListFolder( fldr+"/"+plugName, ".inc", 1 )[0];
			if( incName ) {
    			var plugTitle = incName.split(".")[0];
    			plugs += (plugs.length?",":"") + plugTitle;
			}
		}
	}
	app.SaveText( "_Plugins", plugs, "spremote" );
}

//Copy user plugins into private plugins folder.
function ImportUserPlugins()
{
	var pubFldr = app.GetPath()+"/Plugins";
	var privFldr = app.GetPrivateFolder( "Plugins" );
   
	//List plugin files.
	var list = app.ListFolder( pubFldr, ".zip" );
	for( var i=0; i<list.length && list[0]!=""; i++ )
	{
	    //Get plugin name.
	    plugName = list[i].slice(0,-4);
	    //if( plugName.indexOf("user_")==0 ) 
	    //{
    	    //console.log( "plugin: " + plugName );
    	   
    	    //Set globals and create private plugin dir.
    	    plugDir = privFldr+"/"+plugName.toLowerCase();
    	    plugFile = plugDir + "/" + plugName + ".zip";
            app.MakeFolder( plugDir );
            
    	    //Copy user plugin to private plugin dir.
    	    app.CopyFile( pubFldr+"/"+list[i], plugFile );
    	    
    	    //Trigger install process.
    	    dload_OnComplete();
    	    
    	    //Delete user's plugin.
    	    app.DeleteFile( pubFldr+"/"+list[i] );
	    //}
	}
}

//Convert and import user Apk plugins.
function ConvertApkPlugins()
{
	//List apk files.
	var pubFldr = app.GetPath()+"/Plugins";
	var list = app.ListFolder( pubFldr, ".apk" );
	for( var i=0; i<list.length && list[0]!=""; i++ )
	{
		//Convert to normal plugin.
		plugName = list[i].slice(0,-4);
		ApkToPlugin( pubFldr+"/"+list[i], plugName );
	}
}

//Convert a plugin APK to a normal plugin.
function ApkToPlugin( apkFile, plugName )
{
    //Extract plugin files from APK.
    var tmpFldr = "/sdcard/.DroidScript/Temp";
    app.UnzipFile( apkFile, tmpFldr+"/Plugin" );
    
    //Zip classes.dex file into a jar file in assets folder.
    var jarFile = tmpFldr+"/Plugin/assets/"+plugName+".jar";
    var zipper = app.CreateZipUtil();
    zipper.Create( jarFile );
    zipper.AddFile( "classes.dex", tmpFldr+"/Plugin/classes.dex" );
    zipper.Close();
        
    //Zip all assets files into a zip file.
    var plugFile = tmpFldr + "/Plugin/"+ plugName + ".zip";
    app.ZipFile( tmpFldr+"/Plugin/assets", plugFile );

    //Copy plugin file to plugins folder.    
    var plugFldr = "/sdcard/DroidScript/Plugins";
    app.CopyFile( plugFile, plugFldr+"/"+plugName.toLowerCase()+".zip" );
     
    //Delete original apk file.
    app.DeleteFile( apkFile );
}

//Show the APK building dialog.
function ShowAPKDialog()
{
    //Create dialog window.
    dlgApk = app.CreateDialog( "Build APK" );
    if( !isChrome ) dlgApk.SetBackColor( "#bb000000" );
    layApk = app.CreateLayout( "linear", "vertical,fillxy" );
    layApk.SetPadding( 0.05, 0, 0.05, 0 );

    //Create 'package name' text box.
    var packTitle = curProgram.replace( RegExp( " ","gim"), "" ).toLowerCase();
    packTitle = packTitle.replace( RegExp( "-","gim"), "" );
    var packRoot = app.LoadText( "_userOrg", "com.myname", "spremote" );
    var packName = packRoot + "." + packTitle;
    packName = packName.replace("sw-","");
    packName = packName.replace("sws-","");
    txtApkPkg = app.CreateTextEdit( packName, isChrome?0.4:0.75 );
    layApk.AddChild( txtApkPkg );
    
    //Create 'version' text box.
    txtApkVer = app.CreateTextEdit( "1.00", 0.2 );
    layApk.AddChild( txtApkVer );
    
    //Create 'debug' checkbox.
    chkApkDbg = app.CreateCheckBox( "Debug Build" );
    chkApkDbg.SetMargins( 0,8,0,8, "dip" );
    layApk.AddChild( chkApkDbg );
    chkApkDbg.SetChecked( true );
    chkApkDbg.SetOnTouch( chkApkDbg_OnTouch );
    
    //Create 'obfuscate code' checkbox.
    chkObfuscate = app.CreateCheckBox( "Obfuscate Code" );
    chkObfuscate.SetMargins( 0,8,0,8, "dip" );
    layApk.AddChild( chkObfuscate );
    chkObfuscate.SetChecked( false );
    
    //Create 'include assets' checkbox.
    chkApkAssets = app.CreateCheckBox( "Include System Assets" );
    chkApkAssets.SetMargins( 0,0,0,8, "dip" );
    layApk.AddChild( chkApkAssets );
    chkApkAssets.SetChecked( true );
    
    //Create horizontal layout for Ok and Cancel buttons.
    layApk2 = app.CreateLayout( "linear", "horizontal,fillxy,center" );
    layApk.AddChild( layApk2 );
    
    //Create OK button.
    layApk2.SetMargins( 0, 0.02, 0, 0.01 );  
    btnApkOK = app.CreateButton( "OK", isChrome?0.2:0.25 );
    btnApkOK.SetOnTouch( btnApkOK_OnTouch );
    layApk2.AddChild( btnApkOK );
    
    //Create Cancel button.
    btnApkCancel = app.CreateButton( "Cancel", isChrome?0.2:0.25 );
    btnApkCancel.SetOnTouch( btnApkCancel_OnTouch );
    layApk2.AddChild( btnApkCancel );
   
    //Add dialog layout and show dialog.
    dlgApk.AddLayout( layApk );
    dlgApk.Show();
    
    //Set default password.
    keyPass = "MyPassword";
}

//Handle debug check box.
function chkApkDbg_OnTouch( checked )
{
    if( !checked ) chkObfuscate.SetChecked( true );
}
        
function _LoadScriptX( url, callback )
{
    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.type = 'text/javascript';
    
    if( url.indexOf("http:") >-1 ) {
        script.src = url;
        script.onload = callback;
    }
    else {
         //if (url.charAt[0] !== '/') 
         //   url = app.GetAppPath() + "/" + url;
        script.text = app.ReadFile( url );
        //script.defer = true;
        if( callback ) callback();
    }
    head.appendChild(script);
}

function _LoadPluginX( name )
{
    var privDir = app.GetPrivateFolder( "Plugins" );
    _LoadScriptX( privDir+"/"+name.toLowerCase()+"/"+name+".inc" );
}

function isValid(str){
 return !/[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/g.test(str);
}

//Handle APK 'OK' click.
function btnApkOK_OnTouch()
{
	//Check package name is ok.
	var pkgName = txtApkPkg.GetText();
	var ret = pkgName.match( RegExp("(^|\\.)\\d","gim"), "" );
	if( ret ) { app.Alert( "Package name parts cannot start with numbers", "Name Error" ); return; }
	if( !isValid(pkgName) || pkgName.indexOf(" ")>-1 ) { 
		app.Alert( "Package name cannot contain spaces or symbols", "Name Error" ); return; }
	
	//Check version num is ok.
	var pkgVer = parseFloat(txtApkVer.GetText());
	if( isNaN( pkgVer ) ) { app.Alert( "Version number must be a decimal fraction", "Version Error" ); return; }
	
    //Get debug mode and assets mode.
    debugApk = chkApkDbg.GetChecked();
    useApkAssets = chkApkAssets.GetChecked();
    obfuscate = chkObfuscate.GetChecked();
    
    //Check if we have a key store.
    keyFile = "/sdcard/DroidScript/APKs/user.keystore";
    keyFileDbg = "/sdcard/.DroidScript/debug.keystore";
    if( !debugApk && !app.FileExists( keyFile ) ) {
        ShowKeyStoreDialog();
        return;
    }
    
    //Build the APK.
    if( debugApk )  
        BuildAPK( txtApkPkg.GetText(), curProgram, 
            parseFloat(txtApkVer.GetText().replace(",",".")), obfuscate, "android" );
    else
       ShowPasswordDialog();

	//Save users organisation.
	var org = txtApkPkg.GetText();
	org = org.substr( 0, org.lastIndexOf(".") );
	app.SaveText( "_userOrg", org, "spremote" );
	
    //Remove dialog.
    dlgApk.Dismiss();
}

//Handle APK 'Cancel' click.
function btnApkCancel_OnTouch()
{
    //Remove dialog.
    dlgApk.Dismiss();
}

//Allow user to create key store.
function ShowKeyStoreDialog()
{
    //Create dialog window.
    dlgKey = app.CreateDialog( "Create Key" );
    dlgKey.SetBackColor( "#bb000000" );
    layKey = app.CreateLayout( "linear", "vertical,fillxy" );
    layKey.SetPadding( 0.05, 0, 0.05, 0 );

    //Create info text.
    var info = "You must create a personal key to sign your APK" + 
        " files. Please enter a name, organization and password to " + 
        "generate your key.";
    txtKeyInfo = app.CreateText( info, 0.8, -1, "multiline" );
    txtKeyInfo.SetMargins( 0,0.04,0,0.04 );
    txtKeyInfo.SetTextSize( 16 );
    layKey.AddChild( txtKeyInfo );
     
    //Create 'Name' text box.
    txtKeyName = app.CreateTextEdit( "MyName", 0.6 );
    layKey.AddChild( txtKeyName );
    
    //Create 'Organization' text box.
    txtKeyOrg = app.CreateTextEdit( "MyOrganization", 0.6 );
    layKey.AddChild( txtKeyOrg );
    
    //Create 'Password' text box.
    txtKeyPass = app.CreateTextEdit( keyPass, 0.6 );
    layKey.AddChild( txtKeyPass );
    
    //Create horizontal layout for Ok and Cancel buttons.
    layKey2 = app.CreateLayout( "linear", "horizontal,fillxy,center" );
    layKey.AddChild( layKey2 );
    
    //Create OK button.
    layKey2.SetMargins( 0, 0.02, 0, 0.01 );  
    btnKeyOK = app.CreateButton( "OK", 0.2 );
    btnKeyOK.SetOnTouch( btnKeyOK_OnTouch );
    layKey2.AddChild( btnKeyOK );
    
    //Create Cancel button.
    btnKeyCancel = app.CreateButton( "Cancel", 0.2 );
    btnKeyCancel.SetOnTouch( btnKeyCancel_OnTouch );
    layKey2.AddChild( btnKeyCancel );
   
    //Add dialog layout and show dialog.
    dlgKey.AddLayout( layKey );
    dlgKey.Show();
}

//Handle Key dialog 'OK' click.
function btnKeyOK_OnTouch()
{
    //Get user key info.
    var name = txtKeyName.GetText();
    var org = txtKeyOrg.GetText();
    
    //Make sure APK's folder exists.
    var apkFldr = app.GetPath()+"/APKs";
    app.MakeFolder( apkFldr );
    
    //Create a user key store file and key.
    app.ShowProgress("Creating key...");
    zip = app.CreateZipUtil();
    zip.CreateKey( keyFile, txtKeyPass.GetText(), name, org );
    app.HideProgress();
    
    //Show warning.
    var warn = "A 'user.keystore' file has now been created in the " +
        "DroidScript/APKs folder.\n\nIt is STRONGLY recomended that you " +
        "backup this file. You cannot update Google Play Apps released using " +
        "this key, unless you have the original file (and can also " +
        "remember the password!)\n\n" + 
        "Note: If you rename or delete this file, you will be asked to " +
        "create a new one again.";
    app.Alert( warn, "WARNING" );
    
    //Save current password to memory.
    keyPass = txtKeyPass.GetText();
    
    //Save user org to settings.
    app.SaveText( "_userOrg", "com."+txtKeyOrg.GetText(), "spremote" );
    
    //Remove dialog.
    dlgKey.Dismiss();
    dlgKey.Release();
}

//Handle Key dialog 'Cancel' click.
function btnKeyCancel_OnTouch()
{
     //Remove dialog.
    dlgKey.Dismiss();
    dlgKey.Release();
}

//Show the APK password dialog.
function ShowPasswordDialog()
{
    //Create dialog window.
    dlgPass = app.CreateDialog( "Enter Key Password" );
    dlgPass.SetBackColor( "#bb000000" );
    layPass = app.CreateLayout( "linear", "vertical,fillxy" );
    layPass.SetPadding( 0.05, 0.05, 0.05, 0 );

    //Create 'Password' text box.
    txtPass = app.CreateTextEdit( keyPass, 0.6 );
    layPass.AddChild( txtPass );
    
    //Create horizontal layout for Ok and Cancel buttons.
    layPass2 = app.CreateLayout( "linear", "horizontal,fillxy,center" );
    layPass.AddChild( layPass2 );
    
    //Create OK button.
    layPass2.SetMargins( 0, 0.02, 0, 0.01 );  
    btnPassOK = app.CreateButton( "OK", 0.2 );
    btnPassOK.SetOnTouch( btnPassOK_OnTouch );
    layPass2.AddChild( btnPassOK );
    
    //Create Cancel button.
    btnPassCancel = app.CreateButton( "Cancel", 0.2 );
    btnPassCancel.SetOnTouch( btnPassCancel_OnTouch );
    layPass2.AddChild( btnPassCancel );
   
    //Add dialog layout and show dialog.
    dlgPass.AddLayout( layPass );
    dlgPass.Show();
}

//Handle Pass dialog 'OK' click.
function btnPassOK_OnTouch()
{
    //Build the APK.
    BuildAPK( txtApkPkg.GetText(), curProgram, parseFloat(txtApkVer.GetText().replace(",",".")), 
                    obfuscate, txtPass.GetText() );
                    
    //Remove dialog.
    dlgPass.Dismiss();
    dlgPass.Release();
}

//Handle Pass dialog 'Cancel' click.
function btnPassCancel_OnTouch()
{
    //Remove dialog.
    dlgPass.Dismiss();
    dlgPass.Release();
}

function BuildAPK( packageName, appName, version, minify, pass )
{
    try
    {
        //Show progress dialog.
        app.ShowProgressBar( "Building APK...", 0, isChrome?"light":"" );
         
        //Create APK plugin (if not created yet).
        if( !plgApk ) 
        {
            _LoadPluginX( "ApkBuilder" );
            plgApk = app.CreateObject( "ApkBuilder" );
            if( plgApk==null ) return; 
           
            var privDir = app.GetPrivateFolder( "Plugins" );
           _LoadScriptX( privDir+"/apkbuilder/Uglify/parse-js.js")
           _LoadScriptX( privDir+"/apkbuilder/Uglify/process.js")
           _LoadScriptX( privDir+"/apkbuilder/Uglify/consolidator.js")
           
           if( plgApk.GetVersion() < 1.6 ) alert( "Warning: Your APK builder is out of date!" );
        }
        
        //Copy base unsigned, unmanifested apk to temp folder.
        var apkFldr = app.GetPath()+"/APKs";
        var tmpFldr = "/sdcard/.DroidScript/Temp";
        var appFldr = app.GetPath()+"/"+appName;
        var privDir = app.GetPrivateFolder( "Plugins" );
        
        //Deal with smartwatch apps.
        options = "Launch";
        var isWatchApp = false;
        if( appName.indexOf("SWS-")>-1 ) { isWatchApp = true; options = ""; }
        var newName = appName.replace("SWS-", "");
        newName = newName.replace("SW-", "");
        
        //Create output apk file.
        var zipOut = app.CreateZipUtil();
        zipOut.Create( tmpFldr+"/"+newName+".apk" );
       
        //Open base apk file.
        var zipIn = app.CreateZipUtil();
        
        //Add appropriate engine.
        if( app.IsThings() || HasOption("threads") || HasOption("nodom") ) 
			zipIn.Open( privDir+"/apkbuilder/engv8.dat" );
        else zipIn.Open( privDir+"/apkbuilder/eng.dat" );
        
        //Add new app icon.png file.
        var mainIcon = appFldr+"/Img/"+appName+".png";
        if( app.FileExists( mainIcon ) ) {
			zipOut.AddFile( "res/drawable/icon.png", mainIcon );
			zipOut.AddFile( "res/drawable-xhdpi/icon.png", mainIcon );
		}
		else {
			app.CopyFile( "/Sys/Img/Icon.png", tmpFldr+"/Icon.png" );
			zipOut.AddFile( "res/drawable/icon.png", tmpFldr+"/Icon.png" );
			zipOut.AddFile( "res/drawable-xhdpi/icon.png", tmpFldr+"/Icon.png" );
		}
			
        //Add watch icon (if present). 
        var watchIcon = appFldr+"/Img/"+appName+"-48x48.png"
        if( app.FileExists(watchIcon) ) 
            zipOut.AddFile( "res/drawable/icon_extension48.png", watchIcon );
         
        //Add user's files (and scan for permissions).
        permissions = ""; plugins = "";
        AddFolderWithScan( zipOut, "assets/user", appFldr, appName, minify, true );
         
        //Loop through adding rest of base apk contents.
        var lst = zipIn.List().split(",");
        for( var i=0; i<lst.length; i++ )
        {	
			//Get file extension and check for app.js file etc.
			var ext = lst[i].substr( lst[i].lastIndexOf(".") ).toLowerCase();
			var isMin = ( lst[i].toLowerCase().indexOf(".min.js") > -1 );
            var isJs = ( ext==".js" );
            var isHtml = ( ext==".html" || ext==".htm" );
            var isAppJs = ( lst[i].indexOf("assets/app.js")==0 );
            
			//Exclude '/Sys' assets if required.
			if( !useApkAssets ) {
				if( lst[i].indexOf("assets/Html/")==0 ) continue;
				else if( lst[i].indexOf("assets/Img/")==0 ) continue;
				else if( lst[i].indexOf("assets/Snd/")==0 ) continue;
			}
            //Extract file from source zip.
            zipIn.Extract( lst[i], tmpFldr+"/tmp.dat" );
            
            //Process js files.
			if( minify && isJs && !isMin ) {
				var code = app.ReadFile( tmpFldr+"/tmp.dat" );
				code = Swapify( code, isAppJs );
				app.WriteFile( tmpFldr+"/tmp.dat", code );
			}
			//Add to dest zip.
            zipOut.AddFile( lst[i], tmpFldr+"/tmp.dat" );
            
            //Update progress.
            app.UpdateProgressBar( i * 100/ lst.length );
        }
        
        //Loop through adding required plugins.
        var plugDir = app.GetPrivateFolder( "Plugins" );
        var plugNames = plugins.split(",");
        for( var i=0; plugins!="" && i<plugNames.length; i++ )
        {
			var name = plugNames[i];
			var nameLow = plugNames[i].toLowerCase();
			
			//Add each plugin file found at top level.
			var plugFiles = app.ListFolder( plugDir+"/"+nameLow,"");
			for( var p=0; p<plugFiles.length; p++ )
			{
				var plugFileName = plugFiles[p];
				var plugFilePath = plugDir+"/"+nameLow+"/"+plugFileName;

				if( app.IsFolder( plugFilePath ) ) continue;
			    if( plugFileName == name+'.html') continue;
			    
			    //Get file type.
			    var ext = plugFileName.substr( plugFileName.lastIndexOf(".") ).toLowerCase();
			    var isMin = ( plugFileName.toLowerCase().indexOf(".min.js") > -1 );
			    var isJs = ( ext==".js" );
			    var isInc = ( ext==".inc" );

				//Minify .inc and .js files.
				if( !isMin && (isInc || isJs) )
				{
					var code = app.ReadFile( plugFilePath );
					if( minify ) code = Swapify( code, false );
					zipOut.AddText( "assets/plugins/"+nameLow+"/"+plugFileName, code );
				}
				else zipOut.AddFile( "assets/plugins/"+nameLow+"/"+plugFileName, plugFilePath );
				  
				if( !isMin && (isInc || isJs) ) ScanFile( plugFilePath );
			}
        }
        
        //Add options file.
        zipOut.AddText( "assets/ops", options.toLowerCase() );
        
        //Add new manifest file using template.
        plgApk.UpdateManifest( privDir+"/apkbuilder/amf.dat", tmpFldr+"/tmp.dat", 
					packageName, newName, version, permissions, appFldr, options );
        zipOut.AddFile( "AndroidManifest.xml", tmpFldr+"/tmp.dat" );
        
        //Close zip files.
        zipIn.Close();
        zipOut.Close();
        
        //Create a debug key store if not done.
        if( !app.FileExists( keyFileDbg ) ) zipOut.CreateDebugKey( keyFileDbg );
    
        //Sign apk.
        app.MakeFolder( apkFldr );
        var apk =  apkFldr+"/"+newName+".apk";
        var ok = zipOut.Sign( tmpFldr+"/"+newName+".apk", apk, debugApk?keyFileDbg:keyFile, pass );
        if(!ok) { app.Alert( "Bad Password or Key file!", "Error" ); return; }
        
        //Remove unsigned version.
        app.DeleteFile( tmpFldr+"/"+newName+".apk" );
        
        //Tell user where APK is.
        var msg = "APK created in folder:\n\n /DroidScript/APKs\n\nInstall now?"
    	var yesNoInst = app.CreateYesNoDialog( msg );
		yesNoInst.SetOnTouch( function(res){yesNoInst_OnTouch(res,apk)} );
		yesNoInst.Show();
    }
    finally {
        //Hide progess dialog.
        app.HideProgressBar();
    }
}

//APK complete/install dialog.
function yesNoInst_OnTouch( result, apkFile ) 
{
    if( result=="Yes" ) {
        if( app.FileExists( apkFile ) )  
            app.OpenFile( apkFile, "application/vnd.android.package-archive" );
    	else app.ShowPopup( "APK file '" + apkFile + "' does not exist!" );
    }
}
    
//Recursively add folder contents to zip.
function AddFolderWithScan( zip, name, fldr, appName, minify, isTop )
{
    var list = app.ListFolder( fldr,"");
    for( var i=0; i<list.length; i++ )
    {
        var title = list[i];
        if( !app.IsFolder( fldr+"/"+title ) )
        {
            //Scan .js and .html files for permissions.
            var ext = title.substr( title.lastIndexOf(".") ).toLowerCase();
            var isMin = ( title.toLowerCase().indexOf(".min.js") > -1 );
            var isJs = ( ext==".js" );
            var isHtml = ( ext==".html" || ext==".htm" );
            if( isTop && !isMin && (isJs || isHtml) ) ScanFile( fldr+"/"+title );
            
            //Swap spaces for underscores (for ICS bug)
            var newtitle = title;
            newtitle = newtitle.replace( RegExp( " ","gim"), "_" );
            
            //Add file to zip (with minify if required).
            if( isTop && minify && (isJs || isHtml) && !isMin ) 
            {
                var code = app.ReadFile( fldr+"/"+title );
				code = Swapify( code, false );
				if( !isHtml ) code = Uglify( title, code );
                zip.AddText( name+"/"+newtitle, code );
            }
            else zip.AddFile( name+"/"+newtitle, fldr+"/"+title );
        }
        else
            AddFolderWithScan( zip, name+"/"+title, fldr+"/"+title, appName, minify );
    }
}
   
//Scan a file for required Android permissions and plugins.
function ScanFile( file )
{
    var src = app.ReadFile( file );
    
    //Options.
    if( src.indexOf("app.GetShared") > -1 ) AddOption("Share");
    if( src.indexOf("app.GetIntent") > -1 ) AddOption("Share");
    if( src.indexOf("app.CreateUSBSerial") > -1 ) AddOption("USB");
    
    //Permissions.
    if( src.indexOf("app.CreateNetClient") > -1 ) AddPermission("Network");
    if( src.indexOf("XMLHttpRequest") > -1 ) AddPermission("Network");
    if( src.indexOf("app.GetIPAddress") > -1 ) AddPermission("Network");
    if( src.indexOf("app.GetMacAddress") > -1 ) AddPermission("Network");
    if( src.indexOf("app.GetSSID") > -1 ) AddPermission("Network");
    if( src.indexOf("app.CreateWebServer") > -1 ) AddPermission("Network");
    if( src.indexOf("new WebSocket") > -1 ) AddPermission("Network");
    if( src.indexOf("app.CreateEmail") > -1 ) AddPermission("Network");
    if( src.indexOf("\"http://") > -1 ) AddPermission("Network");
    if( src.indexOf("\"https://") > -1 ) AddPermission("Network");
    if( src.indexOf("\"rtsp://") > -1 ) AddPermission("Network");
    if( src.indexOf("\"ftp://") > -1 ) AddPermission("Network");
    if( src.indexOf("'http://") > -1 ) AddPermission("Network");
    if( src.indexOf("'https://") > -1 ) AddPermission("Network");
    if( src.indexOf("'rtsp://") > -1 ) AddPermission("Network");
    if( src.indexOf("'ftp://") > -1 ) AddPermission("Network");
    if( src.indexOf("GoProController") > -1 ) AddPermission("Network");
    if( src.indexOf("app.SetWifiEnabled") > -1 ) AddPermission("Network");
    if( src.indexOf("app.IsWifiEnabled") > -1 ) AddPermission("Network");
    if( src.indexOf("app.WifiConnect") > -1 ) AddPermission("Network");
    if( src.indexOf("app.SetOnWifiChange") > -1 ) AddPermission("Network");
    if( src.indexOf("app.IsConnected") > -1 ) AddPermission("Network");
    
    if( src.indexOf("app.CreateCameraView") > -1 ) AddPermission("Camera");
    
    if( src.indexOf("app.CreateLocator") > -1 ) AddPermission("Location");
    if( src.indexOf("app.CreateSMS") > -1 ) AddPermission("SMS");
    
    if( src.indexOf("app.PreventScreenLock") > -1 ) AddPermission("WakeLock");
    if( src.indexOf("app.PreventWifiSleep") > -1 ) AddPermission("WakeLock");
    if( src.indexOf("app.Unlock") > -1 ) AddPermission("Unlock");
    
    if( src.indexOf("app.CreateShortcut") > -1 ) AddPermission("Shortcut");
    if( src.indexOf("app.Vibrate") > -1 ) AddPermission("Vibrate");
    if( src.indexOf("app.CheckLicense") > -1 ) AddPermission("License");
    
    if( src.indexOf("app.CreateNxt") > -1 ) AddPermission("Bluetooth");
    if( src.indexOf("app.IsBluetoothOn") > -1 ) AddPermission("Bluetooth");
    if( src.indexOf("app.CreateBluetoothSerial") > -1 ) AddPermission("Bluetooth");
    if( src.indexOf("app.SetBluetoothEnabled") > -1 ) AddPermission("Bluetooth");
    if( src.indexOf("app.IsBluetoothEnabled") > -1 ) AddPermission("Bluetooth");
    if( src.indexOf("SpheroBall") > -1 ) AddPermission("Bluetooth");
    //if( src.indexOf("app.CreateIOIO( \"Bluetooth\" )") > -1 ) AddPermission("Bluetooth");
    if( src.match(/.*?app.CreateIOIO\(\s*?"Bluetooth"\s*?\).*?/i) ) AddPermission("Bluetooth");
    
    if( src.indexOf("app.FileExists") > -1 ) AddPermission("Storage");
    if( src.indexOf("app.IsFolder") > -1 ) AddPermission("Storage");
    if( src.indexOf("app.FolderExists") > -1 ) AddPermission("Storage");
    if( src.indexOf("app.CreateFile") > -1 ) AddPermission("Storage");
    if( src.indexOf("app.WriteFile") > -1 ) AddPermission("Storage");
    if( src.indexOf("app.ReadFile") > -1 ) AddPermission("Storage");
    if( src.indexOf("app.CopyFile") > -1 ) AddPermission("Storage");
    if( src.indexOf("app.CopyFolder") > -1 ) AddPermission("Storage");
    if( src.indexOf("app.DeleteFile") > -1 ) AddPermission("Storage");
    if( src.indexOf("app.OpenFile") > -1 ) AddPermission("Storage");
    if( src.indexOf("app.DeleteFolder") > -1 ) AddPermission("Storage");
    if( src.indexOf("app.MakeFolder") > -1 ) AddPermission("Storage");
    if( src.indexOf("app.ListFolder") > -1 ) AddPermission("Storage");
    if( src.indexOf("app.RenameFile") > -1 ) AddPermission("Storage");
    if( src.indexOf("app.RenameFolder") > -1 ) AddPermission("Storage");
    if( src.indexOf("app.GetExternalFolder") > -1 ) AddPermission("Storage");
    if( src.indexOf("\"file://") > -1 ) AddPermission("Storage");
    if( src.indexOf("'file://") > -1 ) AddPermission("Storage");
    if( src.indexOf("app.CreateAudioRecorder") > -1 ) AddPermission("Storage");
    if( src.indexOf("app.CreateMediaStore") > -1 ) AddPermission("Storage");
    if( src.indexOf(".TakePicture") > -1 ) AddPermission("Storage");
    if( src.indexOf("app.CreateEmail") > -1 ) AddPermission("Storage"); //Needed for attachments.
    if( src.indexOf(".Save") > -1 ) AddPermission("Storage");			//for canvas.Save().
    
    if( src.indexOf("app.CreateContacts") > -1 ) AddPermission("Contacts");
    if( src.indexOf("content://com.android.contacts") > -1 ) AddPermission("Contacts");
    
    if( src.indexOf("app.CreateSmartWatch") > -1 ) AddPermission("SmartWatch2");
    if( src.indexOf("app.CreatePlayStore") > -1 ) AddPermission("Vending");
    
    if( src.indexOf("app.CreateAudioRecorder") > -1 ) AddPermission("Record");
    if( src.indexOf("app.CreateSpeechRec") > -1 ) AddPermission("Record");
    if( src.indexOf("app.CreateCameraView") > -1 && src.indexOf(".Record") > -1 ) AddPermission("Record");
    
    if( src.indexOf("app.SetRingerMode") > -1 ) AddPermission("Sounds");
    if( src.indexOf("app.SetVolume") > -1 ) AddPermission("Sounds");
    if( src.indexOf("app.SetSpeakerPhone") > -1 ) AddPermission("Sounds");
    if( src.indexOf("app.GetSpeakerPhone") > -1 ) AddPermission("Sounds");
    
    if( src.indexOf("app.Call") > -1 ) AddPermission("Phone");
    if( src.indexOf("app.CreatePhoneState") > -1 ) AddPermission("Phone");
    
    if( src.indexOf("app.GetUser") > -1 ) AddPermission("Accounts");
    if( src.indexOf("app.GetAccounts") > -1 ) AddPermission("Accounts");
    
    if( src.indexOf("app.SetAutoBoot") > -1 ) AddPermission("Boot");
    
    if( src.indexOf("HeartRate") > -1 ) AddPermission("Body");
    
    if( src.indexOf("content://com.android.calendar") > -1 ) AddPermission("Calendar");
    
    if( src.indexOf("app.SetKioskMode") > -1 ) AddPermission("SysWin");
    
    if( src.indexOf("app.GoToSleep") > -1 ) AddPermission("Settings");
    
    if( src.indexOf("app.CreateWallpaper") > -1 ) AddPermission("Wallpaper");
    
    
    //Add extra user options.
    var re = /_AddOptions\( ?["|'](.*?)["|'] ?\)/g;
    while( match = re.exec(src) ) {
        var ops = match[1].split(",");
        for( i in ops ) AddOption( ops[i] );
    }
    
    //Add extra user permissions.
    var re = /_AddPermissions\( ?["|'](.*?)["|'] ?\)/g;
    while( match = re.exec(src) ) {
        var perms = match[1].split(",");
        for( i in perms ) AddPermission( perms[i] );
    }
    
    //Remove user permissions.
    var re = /_RemovePermissions\( ?["|'](.*?)["|'] ?\)/g;
    while( match = re.exec(src) ) {
        var perms = match[1].split(",");
        for( i in perms ) RemovePermission( perms[i] );
    }
    
    //Plugins.
    var re = /app.LoadPlugin\( ?["|'](.*?)["|'] ?\)/g;
    while( match = re.exec(src) ) AddPlugin( match[1] );
}

//Add a optinos (if not already added)
function AddOption( ops )
{
    if( options.indexOf( ops )==-1 ) {
        if( options ) options += ","; 
        options += ops; 
    }
}

//Add a permission (if not already added)
function AddPermission( perm )
{
    if( permissions.indexOf( perm )==-1 ) {
        if( permissions ) permissions += ","; 
        permissions += perm; 
    }
}

//Remove a permission.
function RemovePermission( perm ) {
    permissions = permissions.replace( perm, "" );
}

//Add a plugin to list (if not already added)
function AddPlugin( plugName )
{
    if( plugins.indexOf( plugName )==-1 ) {
        if( plugins ) plugins += ","; 
        plugins += plugName; 
    }
}

//Minify javascript code.
function require() {}
function Uglify( file, orig_code, options )
{
  options || (options = {});
    
  try {
      var ast = parse( orig_code );       // parse code and get the initial AST
      ast = ast_mangle( ast);            // get a new AST with mangled names
      ast = ast_squeeze( ast );          // get an AST with compression optimizations
      var final_code = gen_code( ast );  // compressed code here
      
      //alert( final_code );
      return final_code;
  }
  catch(e) { 
    alert( "Obfuscation error in " + file + ": " + e ); 
    return null; 
    }
};

//Swap method names for numbers.
function Swapify( str, isInclude )
{
    var meths =  Object.getOwnPropertyNames(app).filter(function(property) {
        return typeof app[property] == 'function';
    });
    
    result = str.replace(/app\.(.*?)\s*\(/g, function(m,p1) {
        var i = meths.indexOf(p1);
        return "app."+ (i>-1 ? "_"+i : p1) +"(";
    });
    
    if( isInclude )  {
         result = result.replace(/this\.(.*?) = f/g, function(m,p1) {
            var i = meths.indexOf(p1);
            return "this."+ (i>-1 ? "_"+i : p1) +" = f";
        });
    }
    return result;
}

//Convert a string to unicode escape sequences.
function ToUnicode( string )
{
    return string.replace(/[\s\S]/g, function (escape) {
       return '\\u' + ('0000' + escape.charCodeAt().toString(16)).slice(-4);
    });
}

//Check for new updates etc.
function CheckForUpdates()
{
     try {
    	var url = "http://www.androidscript.org/News/Version.php";
    	var osVer = app.GetOSVersion();
    	var model = app.GetModel();
        var xmlhttp = new XMLHttpRequest();  
        xmlhttp.onreadystatechange = function() { HandleReply(xmlhttp); };  
        xmlhttp.open("POST", url);
        xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xmlhttp.send(JSON.stringify( {hash:hashCode, os:osVer, device:model, isPremium:premium} ));
    }
    catch(e) {}
}

//Handle the servers reply (version number)
function HandleReply( xmlHttp )
{
    try
    {
        if( xmlHttp.readyState==4 )
        {
            //If we got a valid response.
            if( xmlHttp.status==200 )
            {
                var info = JSON.parse(xmlHttp.responseText);
                //app.ShowPopup( "Response: " + info.version );
                var lastVersion = app.LoadNumber( "_LastNewsVersion", 0, "spremote" );
                if( info.version > lastVersion ) { 
                    ShowNews();
                    app.SaveNumber( "_LastNewsVersion", info.version, "spremote" );
                }
            }
        }
    }
    catch(e){}
}

//Show the news dialog.
function ShowNews()
{
    //Create dialog window.
    dlgNews = app.CreateDialog( "News", "NoTitle" );
    if( !isChrome ) dlgNews.SetBackColor( "#bb000000" );
    layNews = app.CreateLayout( "linear", "vertical,fillxy" );
    if( isPortrait ) layNews.SetPadding( 0.03, 0.015, 0.03, 0.015 );
    else layNews.SetPadding( 0.015, 0.03, 0.015, 0.03 );

    //Create a web control.
    webNews = app.CreateWebView( isChrome?0.5:0.90, 0.75, "IgnoreErrors" );
    //webNews.SetMargins( 0, 0.01, 0, 0.01 ); 
    //webNews.SetOnProgress( webPlug_OnProgess );
    layNews.AddChild( webNews );
    webNews.LoadHtml( "Loading News...", "file:///Sys/" );

    //Add dialog layout and show dialog.
    dlgNews.AddLayout( layNews );
    dlgNews.Show();
    
    //Load page
    setTimeout( LoadNews, 100 );
}

//Load the news
function LoadNews()
{
    var url = "http://androidscript.org/News/News.html";
    webNews.LoadUrl( url  );
}

//Show the shop dialog.
function ShowShop()
{
    //Create dialog window.
    dlgShop = app.CreateDialog( "Shop", "NoTitle" );
    if( !isChrome ) dlgShop.SetBackColor( "#bb000000" );
    dlgShop.EnableBackKey( false );
    dlgShop.SetOnBack( OnShopBack );
    
    layShop = app.CreateLayout( "linear", "vertical,fillxy" );
    if( isPortrait ) layShop.SetPadding( 0.01, 0.015, 0.01, 0.015 );
    else layShop.SetPadding( 0.015, 0.03, 0.015, 0.03 );

    //Create a web control.
    webShop = app.CreateWebView( isChrome?0.5:0.98, 0.8, "IgnoreErrors,scrollfade,progress" );
    //webShop.SetMargins( 0, 0.01, 0, 0.01 ); 
    webShop.SetOnProgress( webShop_OnProgess );
    layShop.AddChild( webShop );

    //Add dialog layout and show dialog.
    dlgShop.AddLayout( layShop );
    dlgShop.Show();
    
    //Load page
    setTimeout( LoadShop, 100 );
}

//Load the shop page.
function LoadShop()
{
    var url = "http://www.droidscript.org/shop";
    webShop.LoadUrl( url  );
}

//Handle back in shop dialog.
function OnShopBack()
{
    if( webShop.GetUrl().indexOf("/shop")<0 ) webShop.Back();
    else dlgShop.Dismiss();
}

//Show page load progress.
function webShop_OnProgess( progress )
{
    if( progress > 90 ) 
        HideWpHeaderAndFooter(); 
}

function HideWpHeaderAndFooter()
{
    var html = "var el = document.getElementsByTagName('header');"
       + "for(var i=0; i<el.length; i++) el[i].style='display:none;visibility:hidden';";   
    
    html += "el = document.getElementsByTagName('footer'); "
            + "for(var i=0; i<el.length; i++) el[i].style.display='none';";       
    
    html += "el = document.getElementsByClassName('breadcrumb-box text-left');"
            + "for(var i=0; i<el.length; i++) el[i].style.display='none';";
    
    webShop.Execute( html );
}

//Show the demos dialog.
function ShowDemos()
{
    //Create dialog window.
    dlgDemo = app.CreateDialog( "Demos" );
    if( !isChrome ) dlgDemo.SetBackColor( "#bb000000" );
    layDemo = app.CreateLayout( "linear", "vertical,fillxy" );
    if( isPortrait ) layDemo.SetPadding( 0.03, 0.015, 0.03, 0.015 );
    else layDemo.SetPadding( 0.015, 0.03, 0.015, 0.03 );

    //Create a web control.
    webDemo = app.CreateWebView( isChrome?0.5:0.95, 0.80, "IgnoreErrors" );
    webDemo.SetOnProgress( webPlug_OnProgess );
    layDemo.AddChild( webDemo );

    //Add dialog layout and show dialog.
    dlgDemo.AddLayout( layDemo );
    dlgDemo.Show();
    
    //Load page
    app.ShowProgress("Loading...");
    setTimeout( "app.HideProgress()", 7000 );
    webDemo.LoadUrl( "http://www.androidscript.org/Home/demos.html?demos=true" );
}


//Rename AS folder to DS.
//(Called from app.js before extract)
function _CheckFolderName()
{
    if( app.FolderExists( "/sdcard/AndroidScript" ) )
    {
        if( !app.FolderExists( "/sdcard/DroidScript" ) )
           app.RenameFolder( "/sdcard/AndroidScript", "/sdcard/DroidScript" );
    }
}


//Get the users purchase status.
function GetPremiumStatus()
{
    playStore.GetPurchases( OnPremPurchases, "SUBS" );
}

//Show user's purchases.
function OnPremPurchases( items )
{
    for( var i=0; i<items.length; i++ )
    {
        if( items[i].productId.indexOf("subs_premium")>-1 && items[i].purchaseState==0 )
            premium = true;
    }
    
    //Allow premium overrides.
    if( app.IsEngine() ) premium = true;
    if( app.FileExists( "/sdcard/DroidScript/_nopremium_") ) premium = false;
    
    if( !headless )
    {
		//Reset menus if premium.
		LoadMenus();
	    
		//Relist samples if premium.
		if( premium ) lstSamp.SetList( GetSamples() );
	    
	    //Ask user to select language if user is not english speaking.
        if( app.IsNewVersion() ) 
        {
            var code = app.GetLanguageCode();
            if( code!="en" ) alert( T("SelectLang",code) );
        }
    
		//Check for updates (once we know if user is premium).
		CheckForUpdates();
    }
}


//Show subscription info box.
function ShowPremium()
{
    //Create dialog window and main layout.
    dlgPrem = app.CreateDialog( "DroidScript Premium" );
    if( !isChrome ) dlgPrem.SetBackColor( "#bb000000" );
    var layPremDlg = app.CreateLayout( "linear", "vertical,fillxy" );
    
    //Create scroller.
	var scroll = app.CreateScroller();
	scroll.SetMargins( 0.05, isChrome?0.03:0, 0.05, 0 );
	layPremDlg.AddChild( scroll );
	
	//Create layout inside scroller.
    var layPrem = app.CreateLayout( "linear", "vertical,fillxy" );
    scroll.AddChild( layPrem );

    //Create info text.
    var s = T("PremiumFeatures")+":<br><br>"
        + "&bull; "+T("FreeAccessTo")
        +" <font color=#33B5E5>"+T("AllPlugins")+"</font>"
        +", "+T("IncludingAPKBuilder")+"<br><br>"
        + "&bull; "+T("PriorityHelp")
        + " <font color=#33B5E5>"+T("PremiumSupport")+"</font> forum<br><br>"
        + "&bull; "+T("AccessTo")+" <font color=#33B5E5>"+T("AdvancedFeatures")
        +"</font> "+T("SuchAs")+"<br><br>"
        + "&bull; "+T("AccessTo")+" <font color=#33B5E5>"+T("AdvancedSamples")+"</font>";
    var txtPrem = app.CreateText( s, isChrome?0.4:0.85,-1, "Left,Html,MultiLine" );
    txtPrem.SetTextSize( isChrome?10:18 );
    if( !isChrome ) txtPrem.SetTextColor( "#ffffff");
    layPrem.AddChild( txtPrem );
    
    //Create price text.
    txtPremPrice = app.CreateText( "", isChrome?0.4:0.8 );
    if( !isChrome ) txtPremPrice.SetTextColor( "#ffffff" );
    txtPremPrice.SetTextSize( isChrome?12:20 );
    if( isChrome ) txtPremPrice.SetMargins( 0,8,0,0, "dip" );
    if( premium ) txtPremPrice.Gone();
    layPrem.AddChild( txtPremPrice );   
    
    if( premium ) {
		var txtIsPrem = app.CreateText( T("YouArePremium") );
		txtIsPrem.SetMargins( 0, 0.04, 0,isChrome?0.03:0.02 );
		txtIsPrem.SetTextColor("#33B5E5");
		txtIsPrem.SetTextSize( isChrome?14:20 );
		layPrem.AddChild( txtIsPrem );
    }
    else {
		var btnGoPrem = app.CreateButton( T("GoPremium"), 0.4,0.1 );
		btnGoPrem.SetMargins( 0, 0.04, 0,isChrome?0.03:0.02 );
		btnGoPrem.SetTextSize( isChrome?10:16 );
		if( isChrome  ) { 
		   // btnGoPrem.SetBackColor( "#aaaaaa" );
		   // btnGoPrem.SetTextColor( "#333333" );
		}
		btnGoPrem.SetOnTouch( btnGoPrem_OnTouch );
		layPrem.AddChild( btnGoPrem );   
    }

    //Add dialog layout and show dialog.
    dlgPrem.AddLayout( layPremDlg );
    dlgPrem.Show();

	//Create a playstore object.
	setTimeout( ShowPremiumPrice, 100 );
}

//Show premium price.
function ShowPremiumPrice()
{
    playStore.GetBillingInfo( "subs_premium2", OnPremiumStoreInfo, "SUBS" );
}

//Show Play Store subscription price.
function OnPremiumStoreInfo( items )
{
    if( items.length )
        txtPremPrice.SetText( items[0].price + "/month" );
}

//Show the premium sign up page.
function btnGoPrem_OnTouch()
{
    dlgGo = app.CreateDialog( "DroidScript " + T("Premium") );
    if( !isChrome ) dlgGo.SetBackColor( "#ee000000" );
    layGo = app.CreateLayout( "linear", "vertical,fillxy" );

    var txtPrem = app.CreateText( T("EnterPremiumEmail"), isChrome?0.4:0.8,-1, "Left,MultiLine" );
    txtPrem.SetMargins( 0.1, isChrome?0.04:0, 0.1, 0 );
    txtPrem.SetTextSize( isChrome?12:18 );
    if( !isChrome ) txtPrem.SetTextColor("#ffffff");
    layGo.AddChild( txtPrem );
    
    var email = app.GetUser();
    edtGo = app.CreateTextEdit( email, isChrome?0.3:0.7, -1 );
    edtGo.SetMargins( 0,0.04, 0,0 );
    layGo.AddChild( edtGo );
    
    var btnGo = app.CreateButton( T("SignMeUp"), isChrome?0.2:0.4,0.1 );
    btnGo.SetMargins( 0, 0.04, 0,0.02 );
    btnGo.SetTextSize( isChrome?10:16 );
    btnGo.SetOnTouch( btnGo_OnClick );
    layGo.AddChild( btnGo );   

    dlgGo.AddLayout( layGo );
    dlgGo.Show();
}

//Handle the sign up.
function btnGo_OnClick()
{
    userId = edtGo.GetText().trim();
    if( userId.length > 0 && userId.indexOf("@")>-1 )
    {
        playStore.Purchase( "subs_premium2", "MyToken", OnPremPurchased, "SUBS" );
    }
}

//Handle completed purchase.
function OnPremPurchased( prodId, orderId, purchToken, devToken, packageName )
{
    //console.log( prodId +" "+ orderId +" "+ purchToken );
    
    //Register user's premium email.
    try {
		var ver = app.GetVersion();
    	var url = "http://androidscript.org/subscription/registernewsub.php";
        var xmlhttp = new XMLHttpRequest();  
        xmlhttp.open("POST", url);
        xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xmlhttp.send(JSON.stringify( {user:userId, product:prodId, 
            order:orderId, hash:hashCode, purchase:purchToken, version:ver} ));
    }
    catch(e) {}
    
    dlgGo.Dismiss();
    dlgPrem.Dismiss();
    
    //Update purchase state.
    var s = "Welcome to DroidScript Premium!\n\n" +
        "You will receive an email explaining how to access the premium " + 
        "support forum within the next 24 hours.\n\nPlease restart DroidScript to " + 
        "access your premium features.\n"
    app.Alert( s, "DroidScript Premium" );
    
    //Mark the user as a premium user.
    premium = true;
}

//Get list of samples.
function GetSamples() //"+T("")+"
{
	var listArray = "Hello World:"+T("SampHelloWorld")+":x";
    listArray += ",Controls Demo:"+T("SampControlsDemo")+":x";
    listArray += ",Button Styles:"+T("SampButtonStyles")+":x";
    listArray += ",Drawing Demo:"+T("SampDrawingDemo")+":x";
    listArray += ",Drawing Order:"+T("SampDrawingOrder")+":x";
    listArray += ",Image Rotate:"+T("SampImageRotate")+":x";
    if( !isThings ) listArray += ",Image Tween:"+T("SampImageTween")+":x";
    if( !isThings ) listArray += ",Layout Slide:"+T("SampLayoutSlide")+":x";
    if( !isThings ) listArray += ",Drawer Menu:"+T("SampDrawerMenu")+":x";
    listArray += ",Dialog ProgressBar:"+T("SampDialogProgress")+":x";
    listArray += ",Dialog Custom:"+T("SampDialogCustom")+":x";
    listArray += ",Tabs Demo:"+T("SampTabsDemo")+":x";
    listArray += ",Icon Fonts:"+T("SampIconFonts")+":x";
    listArray += ",Icon Buttons:"+T("SampIconButtons")+":x";
    listArray += ",Text Formatting:"+T("SampTextFormatting")+":x";
    listArray += ",Scroller:"+T("SampScroller")+":x";
    if( !isSBC ) listArray += ",Tilt And Draw:"+T("SampTiltAndDraw")+":x";
    if( !isSBC ) listArray += ",Location:"+T("SampLocation")+":x";
    if( !isThings ) listArray += ",Notifications:"+T("SampNotify")+":x";
    listArray += ",Alarms:"+T("SampAlarms")+":x";
    if( !isThings ) listArray += ",Choose:"+T("SampChoose")+":x";
    if( !isSBC ) listArray += ",Orientation:"+T("SampOrientation")+":x";
    if( !isSBC ) listArray += ",Phone States:"+T("SampPhoneStates")+":x";
    listArray += ",Audio Output:"+T("SampAudioOutput")+":x";
    listArray += ",Audio Player:"+T("SampAudioPlayer")+":x";
    listArray += ",Audio Record:"+T("SampAudioRecord")+":x";
    listArray += ",Audio Sample:"+T("SampAudioSample")+":x";
    listArray += ",Audio Signal:"+T("SampAudioSignal")+":x";
    listArray += ",Audio Synth:"+T("SampAudioSynth")+":x";
    listArray += ",Audio MIDI-Tune:"+T("SampAudioMidi")+":x";
    listArray += ",Sound Board:"+T("SampSoundBoard")+":x";
    listArray += ",Speech Recognition:"+T("SampSpeechRec")+":x";
    listArray += ",Voice Command:"+T("SampVoiceCommand")+":x";
    listArray += ",MediaStore:"+T("SampMediaStore")+":x";
    listArray += ",Video Player:"+T("SampVideoPlayer")+":x";
    listArray += ",Video Stream:"+T("SampVideoStream")+":x";
    if( !isThings ) listArray += ",Game Pong:"+T("SampGamePong")+":x";
    //listArray += ",Game Invaders:Simple invaders game:x";
    if( !isThings ) listArray += ",Game Bounce:"+T("SampGameBounce")+":x";
    if( !isSBC ) listArray += ",Game VScroll:"+T("SampGameVScroll")+":x";
    if( !isSBC ) listArray += ",Game HScroll:"+T("SampGameHScroll")+":x";
    if( !isSBC ) listArray += ",Game Flappy:"+T("SampGameFlappy")+":x";
    listArray += ",Joystick:"+T("SampJoystick")+":x";
    if( !isThings ) listArray += ",GLView Simple:"+T("SampGLVSimple")+":x";
    if( !isThings ) listArray += ",GLView SpriteSheet:"+T("SampGLVSprite")+":x";
    if( !isThings ) listArray += ",GLView Advanced:"+T("SampGLVAdvanced")+":x";
    listArray += ",Text To Speech:"+T("SampTextToSpeech")+":x";
    listArray += ",Text Editor:"+T("SampTextEdit")+":x";
    if( !isThings ) listArray += ",SMS:"+T("SampSMS")+":x";
    listArray += ",Mail Share:"+T("SampMailShare")+":x";
    listArray += ",Mail Send:"+T("SampMailSend")+":x";
    listArray += ",Mail Receive:"+T("SampMailReceive")+":x";
    listArray += ",Security Encryption:"+T("SampSecurityEncrypt")+":x";
    listArray += ",Database:"+T("SampDatabase")+":x";
    listArray += ",Calculator:"+T("SampCalculator")+":x";
    if( !isThings ) listArray += ",WebView Demo:"+T("SampWebViewDemo")+":x";
    //now a demo: if( !isThings ) listArray += ",WebView Gauges:"+T("SampWebViewGauges")+":x";
    //now a demo: if( !isThings ) listArray += ",WebView Graphs:"+T("SampWebViewGraphs")+":x";
    if( !isThings ) listArray += ",HTML Sensors:"+T("SampHTMLSensors")+":h";
    listArray += ",HTTP Server:"+T("SampHTTPServer")+":x";
    listArray += ",HTTP Get:"+T("SampHTTPGet")+":x";
    listArray += ",Download:"+T("SampDownload")+":x";
    listArray += ",Wifi Demo:"+T("SampWifiDemo")+":x";
    listArray += ",Wifi Broadcast:"+T("SampWifiBroadcast")+":x";
    listArray += ",TCP Client:"+T("SampTCPClient")+":x";
    listArray += ",Camera Record:"+T("SampCameraRecord")+":x";
    listArray += ",Camera Stream:"+T("SampCameraStream")+":x";
    listArray += ",Camera Snap:"+T("SampCameraSnap")+":x";
    listArray += ",Camera Motion:"+T("SampCameraMotion")+":x";
    listArray += ",Camera Color:"+T("SampCameraColor")+":x";
    if( !isSBC ) listArray += ",Camera Faces:"+T("SampCameraFaces")+":x";
    //listArray += ",SmartWatch:Control programs with a Sony SmartWatch (PRO):x";
    //if( app.IsPro() ) listArray += ",SmartWatch Service:Write a Sony SmartWatch app (PRO):x";
    listArray += ",Shared Data:"+T("SampSharedData")+":x";
    listArray += ",Receive Intent:"+T("SampReceiveIntent")+":x";
    if( !isThings ) listArray += ",Send Intent:"+T("SampSendIntent")+":x";
    if( !isThings ) listArray += ",Send Files:"+T("SampSendFiles")+":x";
    listArray += ",App Events:"+T("SampAppEvents")+":x";
    listArray += ",USB Serial:"+T("SampUSBSerial")+":x";
    listArray += ",USB Espruino:"+T("SampUSBEspruino")+":x";
    listArray += ",USB Arduino:"+T("SampUSBArduino")+":x";
    listArray += ",Bluetooth Serial:"+T("SampBluetoothSerial")+":x";
    listArray += ",Bluetooth Select:"+T("SampBluetoothSelect")+":x";
    listArray += ",Bluetooth Listen:"+T("SampBluetoothListen")+":x";
    if( !isSBC ) listArray += ",Bluetooth LEDs:"+T("SampBluetoothLEDs")+":x";
    
	listArray += ",NXT Motors:"+T("SampNXTMotors")+":x";
	listArray += ",NXT Beep:"+T("SampNXTBeep")+":x";
	listArray += ",NXT Sensors:"+T("SampNXTSensors")+":x";
	listArray += ",NXT Joypad:"+T("SampNXTJoypad")+":x"; 
    
    if( !isThings ) listArray += ",In-App Purchasing"+(!premium?" &#9830;":"")+":"+T("SampInAppPurchase")+":x";
    if( !isThings ) listArray += ",Subscription Template"+(!premium?" &#9830;":"")+":"+T("SampSubsTemplate")+":x";
    listArray += ",Themes"+(!premium?" &#9830;":"")+":"+T("SampThemes")+":x";
    listArray += ",Query Content"+(!premium?" &#9830;":"")+":"+T("SampQueryContent")+":x";
    listArray += ",Query Calendar"+(!premium?" &#9830;":"")+":"+T("SampCalendar")+":x";
    if( !isThings ) listArray += ",Launcher"+(!premium?" &#9830;":"")+":"+T("SampLauncher")+":x";
    listArray += ",Terminal"+(!premium?" &#9830;":"")+":"+T("SampTerminal")+":x";
    if( !isThings ) listArray += ",Analytics"+(!premium?" &#9830;":"")+":"+T("SampAnalytics")+":x";
    listArray += ",Sdcard Access"+(!premium?" &#9830;":"")+":"+T("SampSdcard")+":x";
    listArray += ",Wizard"+(!premium?" &#9830;":"")+":"+T("SampWizard")+":x";
    
    //Save samples list for IDE.
    app.SaveText( "_Samples", listArray, "spremote" );
    
    //List DSJ samples (for wifi ide)
    GetDsjSamples();
    
    return listArray;
}

//Get list of DSJ samples.
function GetDsjSamples()
{
	var listArray = "Hello World:"+T("SampHelloWorld")+":x";
    listArray += ",Text To Speech:"+T("SampTextToSpeech")+":x";
    
	//Save samples list for IDE.
    app.SaveText( "_DsjSamples", listArray, "spremote" );
    
	return listArray;
}
	
//---- SDK ---------------------------------------------------------


//Show the SDK dialog.
function ShowSDKDialog()
{
    //Create dialog window.
    var dlgSdk = app.CreateDialog( "Plugin Creator" );
    dlgSdk.SetBackColor( "#bb000000" );
    laySdk = app.CreateLayout( "linear", "vertical,fillxy" );
    laySdk.SetPadding( 0.05, 0.05, 0.05, 0 );
    
    //Create plugin info controls.
    PlgEdt = app.CreateTextEdit("MyPlugin", 0.75, -1, "NoSpell,MonoSpace,SingleLine");
    PlgEdt.SetHint("MyPlugin");
    laySdk.AddChild(PlgEdt);

    var packRoot = app.LoadText( "_userOrg", "com.myname", "spremote" );
    PkgEdt = app.CreateTextEdit( packRoot, 0.75, -1, "NoSpell,MonoSpace,SingleLine" );
    PkgEdt.SetHint("com.myname");
    laySdk.AddChild(PkgEdt);
    
    lstPlgType = app.CreateSpinner( "Basic,Control", 0.4 );
    lstPlgType.SetMargins( 0, 0.05, 0, 0 );
	laySdk.AddChild( lstPlgType );
    
    var btn2 = app.CreateButton("Create", 0.3 );
    btn2.SetOnTouch( CreateAideProject );
    btn2.SetMargins( 0, 0.05, 0, 0.02 );
    laySdk.AddChild(btn2);

    //Add dialog layout and show dialog.
    dlgSdk.AddLayout( laySdk );
    dlgSdk.Show();
}

//Create an AIDE project.
function CreateAideProject()
{
	//Check if AIDE exists.
	if( !app.IsAppInstalled("com.aide.ui") ) { app.Alert('Please install AIDE', "Error"); return; }
	
	//Get user entries.
	var aide = "/sdcard/AppProjects";
    var sPname =  PlgEdt.GetText();
    if (sPname === '') { return app.Alert('Missing Plugin Name!', "Name Error"); }
    if( !isValid(sPname) || sPname.indexOf(" ")>-1 ) { 
		app.Alert( "Plugin name cannot contain spaces or symbols", "Name Error" ); return; }
    
    var sPkg =  PkgEdt.GetText();
    if (sPkg === '') { return app.Alert('Missing Package name!', "Name Error"); }
    var ret = sPkg.match( RegExp("(^|\\.)\\d","gim"), "" );
	if( ret ) { app.Alert( "Package name parts cannot start with numbers", "Name Error" ); return; }
	if( !isValid(sPkg) || sPkg.indexOf(" ")>-1 ) { 
		app.Alert( "Package name cannot contain spaces or symbols", "Name Error" ); return; }
    
    var sPackage = sPkg.toLowerCase()+'.plugins.user';
    var fldr = aide+'/'+sPname;
    if( app.FolderExists(fldr) ) { return app.Alert(sPname+" project directory exists.  You must pick a different plugin name or delete this folder: \n\n"+fldr); }
    var srcFiles = '/assets/sdk/';
    var type = lstPlgType.GetText();
    var sAdd = (type=="Basic" ? '' : 'Ctl');
        
    app.ShowProgress( "Creating Plugin Project..." );
    app.MakeFolder(fldr+'/libs');
    app.MakeFolder(fldr+'/assets');
    app.MakeFolder(fldr+'/res/drawable');
    
    var src = fldr+'/src';
    app.MakeFolder(src);
    var aP = sPackage.split('.');
    aP.forEach(function (item) {
        src += '/'+item;
        app.MakeFolder(src);
    });
    
    var installer = app.ReadFile(srcFiles+'Installer.java');
    installer = replaceAll(installer,'%PACKAGENAME%', sPackage);
    installer = replaceAll(installer,'%PLUGINNAME%', sPname);
    app.WriteFile(src+'/Installer.java', installer);
    
    if( type=="Control" ) {
        var control = app.ReadFile(srcFiles+'MyButton.java');
        control = replaceAll(control,'%PACKAGENAME%', sPackage);
        control = replaceAll(control,'%PLUGINNAME%', sPname);
        app.WriteFile(src+'/MyButton.java', control);
    }
    
    var java = app.ReadFile(srcFiles+sAdd+'Plugin.java');
    java = replaceAll(java,'%PACKAGENAME%', sPackage);
    java = replaceAll(java,'%PLUGINNAME%', sPname);
    app.WriteFile(src+'/'+sPname+'.java', java);
    
    var inc = app.ReadFile(srcFiles+sAdd+'Plugin.inc');
    inc = replaceAll(inc,'%PACKAGENAME%', sPackage);
    inc = replaceAll(inc,'%PLUGINNAME%', sPname);
    app.WriteFile(fldr+'/assets/'+sPname+'.inc', inc);
    
    var html = app.ReadFile(srcFiles+sAdd+'Plugin.html');
    html = replaceAll(html,'%PACKAGENAME%', sPackage);
    html = replaceAll(html,'%PLUGINNAME%', sPname);
    app.WriteFile(fldr+'/assets/'+sPname+'.html', html);
    
    var droid = app.ReadFile(srcFiles+'AndroidManifest.xml');
    droid = replaceAll(droid,'%PACKAGENAME%', sPackage);
    droid = replaceAll(droid,'%PLUGINNAME%', sPname);
    app.WriteFile(fldr+'/AndroidManifest.xml', droid);
    
    app.CopyFile(srcFiles+'icon.png', fldr+'/res/drawable/icon.png' );
    app.HideProgress();
    
    //Run AIDE.
    var packageName = "com.aide.ui";
    var className = "com.aide.ui.MainActivity";
    var action = "android.intent.action.VIEW";
    var srcPath = "src/" + sPackage.replace( RegExp(".","gim"), "/" ); 
    var uri = src+'/'+sPname+'.java';
    app.SendIntent( packageName, className, action, null, uri ); 
}

function replaceAll(sString, sSearch, sReplace) 
{
    return sString.split(sSearch).join(sReplace);
}


//----- Coding menus -----------------------------------------------

var lastSearch="", lastReplace="", ccTimer=null;

//Calculate size of coding menu objects etc.
function PrepareCodingMenus()
{
    //Edit these values for different Apps.
    isPortrait = ( app.GetOrientation()=="Portrait" );
    infoHeight = ( isPortrait ? (tablet?(aspect>0.67?0.04:0.034):0.055) : (tablet?(aspect>0.67?0.06:0.05):0.085) ); 
    topBarHeight = ( isPortrait ? (tablet?(aspect>0.67?0.055:0.05):0.08) : (tablet?(aspect>0.67?0.085:0.08):0.146) ); 
    bottomBarHeight = ( isPortrait ? (tablet?0.05:0.06) : (tablet?0.08:0.1) );
    searchBarHeight = ( isPortrait ? (tablet?(aspect>0.67?0.1:0.08):0.15) : (tablet?(aspect>0.67?0.16:0.14):0.28) );
    copyWidth =  ( isPortrait ? 0.16 : 0.09 );
    copyHeight = ( isPortrait ? 0.34 : 0.64 );
    ccHeight = 1-topBarHeight-bottomBarHeight-infoHeight;
    pxv = 1.0/app.GetDisplayHeight();
}

//Resize coding menus (eg. after device rotate).
function ResizeCodingMenus()
{
    PrepareCodingMenus();
    
    layCopy.SetPosition( isPortrait?0.842:0.91, isPortrait?0.12:0.15 );
    lstCopy.SetSize( copyWidth, copyHeight );
    layCC.SetPosition( isPortrait?0.7:0.77, topBarHeight );
    lstCC.SetSize( 0.3, ccHeight );
    layInfo.SetPosition( 0, 1-bottomBarHeight-infoHeight );
    layInfo.SetSize( 1, infoHeight );
    infoTxt.SetSize( 0.8, infoHeight );
    laySrchWrap.SetPosition( 0, 1-bottomBarHeight-infoHeight-searchBarHeight+pxv );
    laySrch.SetSize( 1, searchBarHeight );
    edtSrch.SetSize( 0.7 );
    edtRep.SetSize( 0.7 );
    srchBtn.SetSize( 0.1, infoHeight );
    infoBtn.SetSize( 0.1, infoHeight );
    
    var shown = app.IsKeyboardShown();
    setTimeout( "HandleShowKeyBoard("+shown+")", 100 );
}

//Create popup coding menus.
function CreateCodingMenus()
{
    //--- Custom popup copy/cut/paste list -----
    
    layCopy = app.CreateLayout( "Linear", "fixxllxxxy" );
    //layCopy.SetMargins( 0.15, (tablet?0.065:0.076), 0,0 );
    layCopy.SetPosition( 0.842, 0.12 );
    layCopy.SetVisibility( "Hide" );
    layMenus.AddChild( layCopy );
    
    cpyLst = "[fa-hand-pointer-o],[fa-arrows-alt],[fa-copy],[fa-cut],[fa-paste]";
    lstCopy = app.CreateList( cpyLst, 0.16, 0.27, "FontAwesome" );    
    //lstCopy.SetPadding( 0,0.005,0,0,0 );
    lstCopy.SetSize( 0.16, copyHeight );
    lstCopy.SetBackColor( "#663366bb" );
    lstCopy.SetTextColor( "#eeeeee" );
    lstCopy.SetTextSize( 27, "pl" );
    lstCopy.SetOnTouch( lstCopy_OnTouch );
    layCopy.AddChild( lstCopy );
    
    //--- Custom popup code completion list -----
    
    layCC = app.CreateLayout( "Absolute", "Horizontal" );
    layCC.SetPosition( 0.7, topBarHeight );
    layCC.SetVisibility( "Hide" );
    layMenus.AddChild( layCC );
    
    arrow = "&nbsp;<font color=#888888>>></font>";
    lstCC = app.CreateList( "", 0.3, ccHeight, "Html" );    
    //lstCC.SetSize( 0.3, ccHeight );
    lstCC.SetBackColor( "#bb666666" );
    lstCC.SetTextColor( "#eeeeee" );
    lstCC.SetTextSize( 12 );
    lstCC.SetEllipsize1( "end" );
    lstCC.SetOnTouch( lstCC_OnTouch );
    layCC.AddChild( lstCC );
    
     //--- Custom lower info bar -----
    
    layInfo = app.CreateLayout( "Linear", "Horizontal,fillxy" );
    layInfo.SetPosition( 0, 1-bottomBarHeight-infoHeight );
    layInfo.SetBackColor( "#bb666666" );
    layInfo.SetVisibility( "Hide" );
    layInfo.SetPadding( 0,2,0,0,"dip" );
    layMenus.AddChild( layInfo );
    
    srchBtn = app.CreateText( "[fa-search]", 0.1, infoHeight, "FontAwesome" );  
    srchBtn.SetSize( 0.1, infoHeight );
    srchBtn.SetTextColor( "#efefef" );
    srchBtn.SetTextSize( tablet?22:18, "dip" );
    srchBtn.SetOnTouchDown( srchBtn_OnTouchDown );
    layInfo.AddChild( srchBtn );
    
    infoTxt = app.CreateText( "", 0.80, infoHeight, "AutoScale" );   
    //infoTxt.SetSize( 0.90, infoHeight );
    infoTxt.SetTextColor( "#eeeeee" );
    infoTxt.SetTextSize( tablet?22:18, "dip" );
    layInfo.AddChild( infoTxt );
    
    infoBtn = app.CreateText( "[fa-bars]", 0.1, infoHeight, "FontAwesome" );  
    infoBtn.SetSize( 0.1, infoHeight );
    infoBtn.SetTextColor( "#efefef" );
    infoBtn.SetTextSize( tablet?22:18, "dip" );
    infoBtn.SetOnTouchDown( infoBtn_OnTouchDown );
    layInfo.AddChild( infoBtn );
    
    //--- Search bar -----------------
    
    laySrchWrap = app.CreateLayout( "Linear", "touchthrough" );
    laySrchWrap.SetPosition( 0, 1-bottomBarHeight-infoHeight-searchBarHeight+pxv );
    layMenus.AddChild( laySrchWrap );
    laySrch = app.CreateLayout( "Linear", "" );
    laySrch.SetSize( 1, searchBarHeight )
    laySrch.SetBackColor( "#bb666666" );
    laySrch.SetVisibility( "Hide" );
    laySrchWrap.AddChild( laySrch );
    
    //Create horizontal layout.
    var layHoriz = app.CreateLayout( "linear", "horizontal" );
    laySrch.AddChild( layHoriz );
    
    //Create search text.
    edtSrch = app.CreateTextEdit( lastSearch, 0.7,-1,"NoSpell,SingleLine" );
    edtSrch.SetTextSize( tablet?22:18, "dip" );
    edtSrch.SetHint( "Search for" );
    edtSrch.SetOnEnter( btnSrchDwn_OnTouch );
    layHoriz.AddChild( edtSrch );
    
    //Create search buttons.
    btnSrchDwn = app.CreateButton( "[fa-arrow-down]", 0.1,-1,"FontAwesome" );
    btnSrchDwn.SetBackColor( "#00666666" );
    btnSrchDwn.SetTextSize( tablet?22:18, "dip");
    btnSrchDwn.SetSize( 0.15 );
    btnSrchDwn.SetOnTouch( btnSrchDwn_OnTouch );
    layHoriz.AddChild( btnSrchDwn );
    btnSrchUp = app.CreateButton( "[fa-arrow-up]", 0.1,-1,"FontAwesome" );
    btnSrchUp.SetBackColor( "#00666666" );
    btnSrchUp.SetTextSize( tablet?22:18, "dip" );
    btnSrchUp.SetSize( 0.15 );
    btnSrchUp.SetOnTouch( btnSrchUp_OnTouch );
    layHoriz.AddChild( btnSrchUp );
    
    //Create horizontal layout.
    var layHoriz = app.CreateLayout( "linear", "horizontal" );
    laySrch.AddChild( layHoriz );
    
    //Create replace text box.
    edtRep = app.CreateTextEdit( lastReplace, 0.7,-1,"NoSpell,SingleLine" );
    edtRep.SetHint( "Replace with" );
    edtRep.SetTextSize( tablet?22:18, "dip" );
    edtRep.SetOnEnter( btnSrchRep_OnTouch );
    layHoriz.AddChild( edtRep );
    
    //Create replace buttons.
    btnSrchRep = app.CreateButton( "[fa-exchange]", -1,-1,"FontAwesome" );
    btnSrchRep.SetBackColor( "#00666666" );
    btnSrchRep.SetTextSize( tablet?22:18, "dip" );
    btnSrchRep.SetSize( 0.15 );
    btnSrchRep.SetOnTouch( btnSrchRep_OnTouch );
    layHoriz.AddChild( btnSrchRep );
    btnSrchRepAll = app.CreateButton( "[fa-asterisk]", -1,-1,"FontAwesome" );
    btnSrchRepAll.SetBackColor( "#00666666" );
    btnSrchRepAll.SetTextSize( tablet?22:18, "dip" );
    btnSrchRepAll.SetSize( 0.15 );
    btnSrchRepAll.SetOnTouch( btnSrchRepAll_OnTouch );
    layHoriz.AddChild( btnSrchRepAll );
    
    //----------------------------------------

    //Add layout to app.     
    app.AddLayout( layMenus );
    app.AddLayout( layFiles ); 
    
    //Use volume keys for cursor movement.
    app.DisableKeys("VOLUME_UP,VOLUME_DOWN");
    app.SetOnKey( OnVolume ) 
    
    //Create code completion object.
    cc = new CodeComp( cc_UpdateList, cc_ShowInfo );
}

function HandleShowKeyBoard( shown )
{
    //console.log( "shown " + shown );
    
    //Resize code completion list.
    dh = app.GetDisplayHeight();
    kbh = app.GetKeyboardHeight() / dh;
    lstCC.SetSize( 0.3, (kbh>0 ? 0.93-kbh : 0.88) );
    
    //Resize code window.
    //console.log( "kbh " + kbh );
    var barh = (isPortrait||!shown?bottomBarHeight:0);
    //console.log( "barh " + barh );
    edit.SetSize( 1.0, 1-kbh-topBarHeight-barh );
    layEditBtns.SetSize( 1.0, bottomBarHeight);
    
    //Move info bar.
    var top = 1-kbh-infoHeight-barh;
    layInfo.SetPosition( 0, top );
    
    //Move search bar.
    var top = 1-kbh-infoHeight-barh-searchBarHeight+pxv;
    laySrchWrap.SetPosition( 0, top );
    
    //Resize code completion list.
    var ccTop = layCC.GetPosition().top;
    var h = 1-kbh-topBarHeight-barh-infoHeight;
    lstCC.SetSize( 0.3, h );  
}

function OnVolume( action,name,code )
{
    var ed = null;
    if( layEdit.GetVisibility()=="Show" ) ed = edit;
    else if( laySamp.GetVisibility()=="Show" ) ed = editSamp;
    
    if( ed ) {
        var pos = ed.GetCursorPos();
        if (name=="VOLUME_UP" && action=="Down") ed.SetCursorPos( pos+1 ); 
        else if (name=="VOLUME_DOWN" && action=="Down") ed.SetCursorPos( pos-1 ); 
    }
}

function cc_UpdateList( type, list, onDot )
{
    //list.unshift( arrow );
    var lst = list.join("~");
    lst = lst.replace( "Destroy~","" );
    lst = lst.replace( "~Release","" );
    lst = lst.replace( "~IsGraphical","" );
    lst = lst.replace( "~_Extract","" );
    lst = lst.replace( "~Try","" );
    
    if( type=="Zip" ){
        lst = lst.replace( "~CreateKey","" );
        lst = lst.replace( "~CreateDebugKey","" );
        lst = lst.replace( "~Sign","" );
        lst = lst.replace( "~UpdateManifest","" );
    }
    lstCC.SetList( lst, "~" );
    
    if( autoHelp && onDot && layCC.GetVisibility()=="Hide" ) 
        layCC.Animate( "SlideFromRight" );
}

function cc_ShowInfo( txt )
{
    infoTxt.SetText( txt );
}

function lstCC_OnTouch( item )
{
    try {
        if( item=="^q^" ) item = "\"";
        if( item.indexOf("&nbsp;") < 0 )
            cc.OnSelect( item );
    }
    catch( e ) {}
}

//Handle yoyo double tap.
function edit_OnDoubleTap( resizeOnly )
{    
    //Set appropriate copy/cut list.
    if( laySamp.GetVisibility()=="Show" ) {
        lstCopy.SetSize( copyWidth, copyHeight/1.65 );
        lstCopy.SetList( "[fa-hand-pointer-o],[fa-arrows-alt],[fa-copy]" );
    }
    else { 
        lstCopy.SetSize( copyWidth, copyHeight );
        lstCopy.SetList( "[fa-hand-pointer-o],[fa-arrows-alt],[fa-copy],[fa-cut],[fa-paste]" );
    }
    
    if( layCC.GetVisibility()=="Show" ) { 
        layCC.Animate( "SlideToRight" );
        infoBtn.SetText("[fa-bars]"); 
    }
    if( !resizeOnly ) {
        if( layCopy.GetVisibility()=="Hide" ) layCopy.Animate( "SlideFromRight" );
        else layCopy.Animate( "SlideToRight" );
    }
}

//Handle code comp info icon on info bar.
function infoBtn_OnTouchDown()
{
    if( layCopy.GetVisibility()=="Show" ) layCopy.Animate( "SlideToRight" );
    
    if( layCC.GetVisibility()=="Show" ) { 
        layCC.Animate( "SlideToRight" ); infoBtn.SetText("[fa-bars]"); 
    }
    else { layCC.Animate( "SlideFromRight" );  infoBtn.SetText("[fa-long-arrow-right]"); }
    
    if( laySrch.GetVisibility()=="Show" ) { 
        laySrch.Animate( "SlideToBottom" ); srchBtn.SetText("[fa-search]"); 
    }
}

//Handle search icon on info bar.
function srchBtn_OnTouchDown()
{
    if( layCopy.GetVisibility()=="Show" ) layCopy.Animate( "SlideToRight" );
    
    if( layCC.GetVisibility()=="Show" ) { 
        layCC.Animate( "SlideToRight" ); infoBtn.SetText("[fa-bars]"); 
    }
    if( laySrch.GetVisibility()=="Show" ) { 
        laySrch.Animate( "SlideToBottom" ); srchBtn.SetText("[fa-search]"); 
    }
    else { laySrch.Animate( "SlideFromBottom" );  srchBtn.SetText("[fa-long-arrow-down]"); }
}

//Handle search down button.
function btnSrchDwn_OnTouch()
{
    var txt = edtSrch.GetText();
    edit.Search( txt, "Forward" );
    lastSearch = txt;
}

//Handle search up button.
function btnSrchUp_OnTouch()
{
    var txt = edtSrch.GetText();
    edit.Search( txt, "Back" );
    lastSearch = txt;
}

//Handle replace icon.
function btnSrchRep_OnTouch()
{
    var rep = edtRep.GetText();
    edit.Replace( rep );
    lastReplace = rep;
    btnSrchDwn_OnTouch();
}

//Handle replace all icon.
function btnSrchRepAll_OnTouch()
{
    var find = edtSrch.GetText();
    var rep = edtRep.GetText();
    edit.ReplaceAll( find, rep );
    lastReplace = rep;
}

//Hide all coding menus.
function HideCodingMenus( keepInfoBar )
{
    if( layCopy.GetVisibility()=="Show" ) layCopy.Animate( "SlideToRight" );
    
    if( layCC.GetVisibility()=="Show" ) { 
        layCC.Animate( "SlideToRight" ); infoBtn.SetText("[fa-bars]"); 
    }
    if( !keepInfoBar ) setTimeout( "layInfo.SetVisibility('Hide')", 100 );
    setTimeout( "laySrch.SetVisibility('Hide'); srchBtn.SetText('[fa-search]');", 100 );
    clearTimeout( ccTimer );
}

//Handle touching on cut/copy/paste menu.
function lstCopy_OnTouch( item )
{
    //Find which edit control is active.
    var ed = edit;
    if( laySamp.GetVisibility()=="Show" ) ed = editSamp;
    
    //Do action.
    var hide=true;
    if( item=="\uf0c5" ) { 
        ed.Copy(); ed.SetSelectMode(false); hide=false; 
        //app.ShowPopup( "Text copied to clipboard" );
    }
    else if( item=="\uf0c4" ) { ed.Cut(); ed.SetSelectMode(false); }
    else if( item=="\uf0ea" ) { ed.Paste(); ed.SetSelectMode(false); }
    else if( item=="\uf25a" ) {
        if( !ed.GetSelectMode() ) { ed.SetSelectMode(true); hide=false; } 
        else ed.SetSelectMode(false);
    }
    else if( item=="\uf0b2" ) {
        if( !ed.GetSelectMode() ) { ed.SelectAll(); hide=false; } 
        else ed.SetSelectMode(false);
    }
    
    //Highlight menu choice briefly.
    //lstCopy.SelectItem( item );
    
    //Hide menu if appropriate.
    if( hide )  { 
        edit_OnDoubleTap(); 
    }
}

function CheckForCodeSuggestions()
{
    try {
        //Hide error line if cursor moved away.
        var curLine = edit.GetCursorLine();
        if( lastCursorLine != curLine ) edit.HighlightLine( -1 );
        lastCursorLine = curLine;
    
        //Show code completion suggestions.
        if( laySrch.GetVisibility()=="Hide" && layCopy.GetVisibility()=="Hide" ) 
            cc.CheckSuggest();
    }
    catch( e ) {}
}

//----- Code Completion -----------------------------------------------

//Code completion object.
function CodeComp( cbList, cbInfo )
{
    var m_curType="";
    var m_curObj="";
    var m_curMethod="", m_lastMethod="";
    var m_lastSuggest, m_lastFiltMethods = [];
    var m_types = { 
        App:"App", Layout:"Lay", Image:"Img", Button:"Btn", Toggle:"Tgl", 
        CheckBox:"Chk", Spinner:"Spn", SeekBar:"Skb", 
        ImageButton:"Ibn", Text:"Txt", TextEdit:"Txe", List:"Lst", WebView:"Web", 
        Scroller:"Scr", Dialog:"Dlg", YesNoDialog:"Ynd", ListView:"Lvw", 
        ListDialog:"Ldg", BluetoothList:"Btl", NetClient:"Net", MediaPlayer:"Aud", 
        Downloader:"Dwn", MediaStore:"Med", PlayStore:"Ply", AudioRecorder:"Rec", 
        Sensor:"Sns", Locator:"Loc", CameraView:"Cam", VideoView:"Vid", GLView:"GLV", 
        NxtRemote:"Nxt", BluetoothSerial:"Bts", ZipUtil:"Zip", Notification:"Not", 
        Crypt:"Crp", SpeechRec:"Spr", NxtInfo:"Inf", IOIO:"IOIO", SMS:"SMS", 
        Email:"EMAIL", WebServer:"Wbs", USBSerial:"Usb", SysProc:"Sys", Synth:"Syn" 
    };
    var m_useful = ["function","var","app","[tab]","=",",",";","(",")","{","}","\"","<",">","[","]"];
    var types = {Layout:"Lay", Image:"Img", Text:"Txt" };
    
    this.CheckSuggest = function()
    {
        var filtMethods = [];
        
        //Get all text and current cursor pos.
        var txt = edit.GetText();
        var curPos = edit.GetCursorPos();
    
        //Get dot and space positions.
        dotPos = txt.lastIndexOf(".",curPos);
        var spacePos = txt.lastIndexOf(" ",curPos-1);
        var newLinePos = txt.lastIndexOf("\n",curPos-1);
        var tabPos = txt.lastIndexOf("\t",curPos-1);
        spacePos = Math.max( spacePos, newLinePos );
        spacePos = Math.max( spacePos, tabPos );
        //app.ShowPopup( "dotPos=" + dotPos + " spacepos=" + spacePos );
        
        if( dotPos > spacePos )
        {
            //Get text after dot.
            var back = txt.substring(dotPos+1,curPos);
            var backLwr = back.toLowerCase();       
            var onDot = (dotPos==curPos-1);
            //app.ShowPopup( "[" + back + "]" );
            
            //Find object name.
            m_curObj = txt.substring( spacePos+1, dotPos );
            
            //Find Object's type.
            m_curType = GetObjType( m_curObj, txt ); 
            if( m_curObj=="app" ) m_curType = "App";
            //console.log( "curType = " + m_curType ); 
            
            if( m_curType )
            {
                //Find current method name.
                m_curMethod = "";
                var bracketPos = txt.indexOf("(",curPos);
                var endLinePos = txt.indexOf("\n",curPos);
                if( bracketPos > 1 && ( bracketPos < endLinePos || endLinePos<0) ) 
                {
                    m_curMethod = txt.substring(dotPos+1,bracketPos);
                    //console.log( "m_curMethod = " + m_curMethod ); 
                    if( m_curMethod != m_lastMethod ) {
                        ShowInfo( m_curType, m_curMethod );
                        m_lastMethod = m_curMethod;
                    }
                }
                
                //Get method list.
                var methods = GetFuncs(m_curType);
                if( methods )
                {
                    if( m_curMethod ) 
                        filtMethods = methods;
                    else {
                        //Get a filtered method list.
                        for( var key in methods ) {
                            if( methods[key].toLowerCase().indexOf(backLwr)>-1 ) 
                                filtMethods.push( methods[key] );
                        }
                    }
                }
            }
        }
        if( filtMethods.length==0 ) filtMethods = m_useful;
        if( filtMethods.toString() != m_lastFiltMethods ) 
        { 
            if( cbList ) cbList( m_curType, filtMethods.slice(0), onDot );
            m_lastFiltMethods = filtMethods.toString();
        }
    }
    
    this.OnSelect = function( funcName )
    {
        //var funcName = choice;
        var curPos = edit.GetCursorPos();
        var txt = edit.GetText();
        
        //Check for special macros.
        if( m_useful.indexOf(funcName)>-1 ) 
        {
            if( funcName=="function" ) { edit.InsertText( "function ()\n{\n\t\n}\n", curPos ); 
                    edit.SetCursorPos(curPos+9);  app.ShowKeyboard(edit); return; }
            else if( funcName=="{" ) { edit.InsertText( "{", curPos ); return; }
            else if( funcName=="}" ) { edit.InsertText( "}", curPos ); return; }
            else if( funcName==";" ) { edit.InsertText( ";", curPos ); return; }
            else if( funcName=="var" ) { edit.InsertText( "var ", curPos ); return; }
            else if( funcName=="=" ) { edit.InsertText( " = ", curPos ); return; }
            else if( funcName=="app" ) { edit.InsertText( "app.", curPos ); return; }
            else if( funcName=="[tab]" ) { edit.InsertText( "\t", curPos ); return; }
            else { edit.InsertText( funcName, curPos ); return; }
        }
        
        //Check for right hand bracket on same line.
        var bracketPos = txt.indexOf( "(", dotPos+1 );
        var spacePos = txt.indexOf(" ", dotPos+1 );
        var newLinePos = txt.indexOf("\n", dotPos+1 );
        
        //Count args of current method.
        var args = eval( "(new "+m_curType+"())."+funcName+".length" );
        //alert( args );
        
        //Get default params.
        var dflts = F_GetDefaults( m_curType+"."+funcName, args );
        
        //Add func to right side of dot (replace current func if bracket found).
        if( bracketPos > -1 && (spacePos==-1 || spacePos > bracketPos) && newLinePos > bracketPos ) 
            edit.ReplaceText( funcName+dflts[0], dotPos+1, bracketPos+2 );
        else 
            edit.ReplaceText( funcName+dflts[0], dotPos+1, curPos );
            
        //Move cursor past next bracket.
        //edit.SetCursorPos( dotPos + funcName.length + dflts[1] );
        var funcEnd = dotPos + funcName.length;
        edit.SetSelection( funcEnd + dflts[1], funcEnd + dflts[2] );
        
        //Show info for method.
        ShowInfo( m_curType, funcName );
    }
    
    //Show method info.
    function ShowInfo( objType, funcName )
    {
        if( m_curType ) {
            var func = eval("new "+objType+"()."+funcName );
            var params = GetParamNames( func );
            if( params ) cbInfo( funcName+"( "+params.join(", ")+" )" ); 
        }
    }
    
    //Find an objects type by scanning backwards
    //for the Create statement.
    function GetObjType( obj, txt )
    {
        try { var createPos = txt.search( new RegExp(obj+".*=.*Create(.*)\\(") ); }
        catch(e) {  return null; }
        if( createPos < 0 ) return null;
        //app.ShowPopup( createPos );
        var type = RegExp.$1.replace(" ","");
        //app.ShowPopup( obj+".*=.*Create(.*)\\(  -->" + "type=[" + type + "]" );
        
        //var types = {Layout:"Lay", Image:"Img", Text:"Txt" };
        //app.ShowPopup( "type=[" + types[type] + "]" );
        return m_types[type];
    }
    
    //Get all methods of an object.
    function GetFuncs( objName )
    {
        var obj = eval("new "+objName+"()" );
        
        //Get obj methods.
        var list = [];
        for (var Key in obj) {
          if (obj.hasOwnProperty(Key) && (typeof obj[Key] === 'function'))
          {
            list.push(Key);
          }
        }
        list.sort();
        return list;
    }
    
    //Get the names of a function's parameters.
    function GetParamNames( func ) 
    {
        if( func ) {
          //var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
          var ARGUMENT_NAMES = /([^\s,]+)/g;
          var fnStr = func.toString();//.replace(STRIP_COMMENTS, '');
          var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
          if(result === null) result = [];
          return result;
        }
    }
    
    //Get default params for various funcs.
    function F_GetDefaults( method, numArgs )
    {
        if( numArgs==0 ) return ["();", 3,3];
        
        if( method=="App.Alert" ) return ["( \"\" );", 4,4];
        else if( method=="App.CreateLayout" ) return ["( \"Linear\", \"Horizontal\" );", 4,4];
        else if( method=="App.CreateText" ) return ["( \"\" );", 4,4];
        else if( method=="App.CreateButton" ) return ["( \"\" );", 4,4];
        else if( method=="App.CreateImage" ) return ["( \"Img/\", 0.5 );", 8,8];
        
        else if( method.indexOf(".SetTextColor") >-1 ) return ["( \"#22ff22\" );", 5,11];
        else if( method.indexOf(".SetBackColor") >-1 ) return ["( \"#cc22cc\" );", 5,11];
        else if( method.indexOf(".SetMargins") >-1 ) return ["( 0.01, 0.01, 0.01, 0.01 );", 5,5];
        else if( method.indexOf(".SetOnTouchUp") >-1 ) return ["( "+m_curObj+"_OnTouchUp );", 5,5];
        else if( method.indexOf(".SetOnTouchDown") >-1 ) return ["( "+m_curObj+"_OnTouchDown );", 5,5];
        else if( method.indexOf(".SetOnTouchMove") >-1 ) return ["( "+m_curObj+"_OnTouchMove );", 5,5];
        else if( method.indexOf(".SetOnTouch") >-1 ) return ["( "+m_curObj+"_OnTouch );", 5,5];
        
        
        else return ["(  );", 3,3];
    }
}

