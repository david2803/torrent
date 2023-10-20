/* Torrents - A multi-plugin-pack for Movian Media Center
 *  
 *	Movian MOD 5.0.734 or newer version required
 *	https://api.deanbg.com
 *  Copyright (C) 2017-2023 dean
 */

{				 // GLOBAL SETTINGS	

	var http		= require('movian/http');
	var popup		= require('native/popup');
	var movian_page	= require('movian/page');
	var movian_store= require('movian/store');
	var movian_service  = require('movian/service');
	var movian_settings = require('movian/settings');	

	var data_hist  = movian_store.create('tey_hist', true);	if (!data_hist)		data_hist = []; 
	var g_entry = [];

	tey = {
		tgx:
		{
			"title": "tGX",
			"id": "tgx",
			"prefix": "tey:tgx",
		},
		
		yts:
		{
			"title": "YTS",
			"id": "yts",
			"prefix": "tey:yts",
		},
		
		etv:
		{
			"title": "ezTV",
			"id": "eztv",
			"prefix": "tey:etv",
		},
	};
	
	var settings = new movian_settings.globalSettings(Plugin.id, "torrents", Plugin.path+"res/tgx/logo.png", "torrents");
	
	settings.createDivider('tGX');

    settings.createMultiOpt('tgx_baseURL', 'tGX Server', [
	        ['https://torrentgalaxy.to/', 'torrentgalaxy.to', true],	
	        ['https://torrentgalaxy.mx/', 'torrentgalaxy.mx'],
	        ['https://tgx.rs/', 'tgx.rs'],			
        ], function(v) {
        tey.tgx.baseURL = v;
    });

    settings.createBool('caching', 'Cache Server Responses', true, function(v) {
        tey.tgx.caching = v;
    });

	settings.createDivider('ezTV');
    settings.createMultiOpt('etv_baseURL', 'ezTV Server', [
	        ['https://eztv.re', 'ezTV.re', true],
	        ['https://eztv.io', 'ezTV.io'],
	        ['https://eztv.ag', 'ezTV.ag'],
	        ['https://eztv.it', 'ezTV.it'],
	        ['https://eztv.ch', 'ezTV.ch'],
        ], function(v) {
        tey.etv.baseURL = v;
    });

	settings.createDivider('YTS');
    settings.createMultiOpt('yts_baseURL', 'YTS Server', [
	        ['https://yts.mx', 'yts.mx', true],
	        ['https://yts.lt', 'yts.lt'],
	        ['https://yts.am', 'yts.am'],
	        ['https://yts.ag', 'yts.ag'],
        ], function(v) {
        tey.yts.baseUrl = v;
    });

    settings.createBool('sync', 'Sync Last-Watched', true, function(v) {
        tey.sync = v;
    });

}	//	GLOBAL SETTINGS	END

{				 // GLOBAL FUNCTIONS

	mytext = {
	  RichText: function(x) {this.str = x.toString();},
	  color: function(str, color, size) {return '<font '+(size?'size="'+size+'" ':'')+'color="' + color + '">' + str + '</font>';}
	};

	mytext.RichText.prototype.toRichString = function(x) {
	  return this.str;
	}
	
    var blue = '6699CC', orange = 'FFA500', red = 'EE0000', green = '008B45', white = 'FFFFFF';
	
    function setPageHeader(res_path, page, title, icon) 
	{
		page.type = "directory";
		page.contents = "items";
		page.metadata.logo = (icon?res_path+icon:res_path + "logo.png");
		page.metadata.icon = (icon?res_path+icon:res_path + "logo.png");
		page.metadata.title = new mytext.RichText(title);
		page.metadata.background = res_path + "bg.jpg";
    }

	new movian_page.Route("tey:sync:(.*):(.*):(.*):(.*)", function(page, sync_user, sync_profile, sync_serv, return_to) {
		data_hist["sync_user"] = sync_user;
		data_hist["sync_profile"] = sync_profile;
		data_hist["sync_serv"] = "http://"+sync_serv;
		popup.notify("[TEY] Setup complete!", 4);
		page.redirect("pluginsBG:"+return_to+":start");
	});

	function watch_history(action, key1n, key2n, key3n)
	{
		if(!tey.sync) return;
		var curr_hist = [];

		var date = new Date();
		var w_time = parseInt(date.getTime()/1000);
		var entries = 0;
		
		hist_func(1); // get

		if(data_hist && data_hist["data"])
		{
			var data_hist_t = null;	try {data_hist_t = JSON.parse(data_hist["data"]);} catch (err){;}
			
			if(data_hist_t && data_hist_t.length)
			for (var widx in data_hist_t)
			{
				key1=data_hist_t[widx].key1; key2=data_hist_t[widx].key2; key3=data_hist_t[widx].key3; watched=data_hist_t[widx].watched;
				if( !(key1==key1n && key2==key2n && (key3==key3n)) )
				{
					curr_hist.push({
						key1: key1,
						key2: key2,
						key3: key3,
						watched: watched
					});
					entries++;
					if(entries>62) break;
				}
			}
		}

		if(action == "add")
			curr_hist.unshift({
				key1: key1n,
				key2: key2n,
				key3: key3n,
				watched: w_time
			});

		data_hist["data"] = JSON.stringify(curr_hist);
		if(tey.sync && data_hist["sync_user"])
			setTimeout(hist_func, (5+(parseInt(Math.random()*5)))*1000);
	}
	
	function hist_func(what)
	{
		if(!tey.sync) return;
		try
		{
			if(!what)
				http.request(data_hist["sync_serv"]+"sync/", {
					postdata: {
						action: "sync-hist",
						plugin: Plugin.id.toLowerCase(),
						user: data_hist["sync_user"],
						profile: data_hist["sync_profile"],
						hist: data_hist["data"]
					},
					method: 'POST',
					noFail: true,
					compression: true,
				});
			else
				data_hist["data"] = http.request(data_hist["sync_serv"]+"sync/", {
					postdata: {
						action: "sync-hist-get",
						plugin: Plugin.id.toLowerCase(),
						user: data_hist["sync_user"],
						profile: data_hist["sync_profile"],
					},
					method: 'POST',
					noFail: true,
					caching: false,					
					compression: true,
				}).toString();				
		}
		catch (err)
		{;}
	}

	new movian_page.Route(Plugin.id + ":entry:(.*):(.*)", function(page, data, pfx) {

		if(!g_entry[data].url) return;
		watch_history("add", g_entry[data].title, g_entry[data].icon, 'torrent:browse:' + g_entry[data].url+"?"+pfx);
		page.redirect('torrent:browse:' + g_entry[data].url);
	});
	
} // GLOBAL FUNCTIONS END


(function(etv) {

	var manifest = tey.etv;

/*
 *  ezTV plugin for Movian
 *
 *  Copyright (C) 2019-2021 deank
 *
 */

    var PREFIX		= manifest.prefix;
	var res_path	= Plugin.path + "res/" + manifest.id + "/";
    var logo = res_path + "logo.png";
    var BG = res_path + "bg.jpg";
	var all_shows = "";


    var service = movian_service.create(manifest.title, PREFIX + ":start", "video", true, logo);

    function browseItems(page, search) 
	{
        page.type = "directory";
        page.contents = "movies";
		page.metadata.glwview =  res_path + "list.view";

        page.entries = 0;

        var pattern2 = /href="(\/shows[\S]*?)"[\s\S]*?href[\s\S]*?epinfo">([\s\S]*?)<[\s\S]*?(magnet\:[\S]*?)"[\s\S]*?([\S])[\s\S]*?<td[\s\S]*?>([\s\S]*?)<[\s\S]*?<td[\s\S]*?>([\s\S]*?)<[\s\S]*?<td[\s\S]*?>([\s\S]*?)<\/td/;
        var pattern1 = /href="(\/shows[\S]*?)"[\s\S]*?href[\s\S]*?epinfo">([\s\S]*?)<[\s\S]*?(magnet\:[\S]*?)"[\s\S]*?href="(http[\S]*?)"[\s\S]*?<td[\s\S]*?>([\s\S]*?)<[\s\S]*?<td[\s\S]*?>([\s\S]*?)<[\s\S]*?<td[\s\S]*?>([\s\S]*?)<\/td/;
		var pattern0 = /header_border"([\s\S]*?<\/tr>)/g;

		var c_page = 0;
		var c_page2 = 10;
		var count = 0;
		var found = true;
		var added = 0;

        function loader() 
		{
			if(!found) return false;
            page.loading = true;
			for (var pageNumber = c_page; pageNumber < (c_page2); pageNumber++) 
			{
				c_page++;
				page.loading = true;

				var url = tey.etv.baseURL + (search ? '/search/'+search.replace(/\s/g, '-') : '/page_'+pageNumber);

				var c = http.request(url, {
					headers: {
						'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
						'Referer': tey.etv.baseURL,
					},
					caching: false,
					compression: true,
				}).toString().match(/header_end\">Seeds<\/td>([\s\S]*?)<\/table>/)[1];

				while ((match1 = pattern0.exec(c)) !== null) 
				{

					match = pattern1.exec(match1[1]);
					if(!match) match = pattern2.exec(match1[1]);
					if(!match) { found = false; break; }

					found = true;
					
					year = -1;
					season = -1;
					episode = -1;
					
					title = match[2].replace(/\./g, " ").replace(/_/g, " ").replace(/<[^>]*>/g, '').replace(/\s\s/g, " ").replace("&#39;","'").replace("[eztv]", "").trim();
					title_base = title;

					var is_series=title.match(/([\s\S]*?)[\.|\s][S|s]([\d][\d])[E|e]([\d][\d])[\S\s]*?(480[p|i]|576[p|i]|720[p|i]|1080[p|i]|2160[p|i]|UHD|FHD|4K|3D|HDTV|HDCAM|DVB|DVD|HBO|AMZN|NF|HULU|AC3|HDRip|PAL|NTSC|BRRip|BDRip|BluRay|Blu-Ray|BDRemux|WEB|XviD|AVC|HEVC|[x|h]264|[x|h]265)/i);
					if(is_series) // S00E00 -> 00x00
					{
						title=is_series[1]+" "+is_series[2]+"x"+is_series[3]+mytext.color("  ("+is_series[4]+") ", 'A0A0A0', "+2");
						title_base=is_series[1].trim();
						season=parseInt(is_series[2]);
						episode=parseInt(is_series[3]);
					}
					else
					{
						is_series=title.match(/([\s\S]*?)[\.|\s][S|s]([\d][\d])[E|e]([\d][\d])/i);
						if(!is_series) is_series=title.match(/([\s\S]*?)[\.|\s]([\d][\d])[x|X]([\d][\d])/i);
						if(is_series) // S00E00 -> 00x00
						{
							title=is_series[1]+" "+is_series[2]+"x"+is_series[3];
							title_base=is_series[1].trim();
							season=parseInt(is_series[2]);
							episode=parseInt(is_series[3]);
						}
						else
						{
							is_series=title.match(/([\s\S]*?)[\.|\s][S|s]([\d][\d])[\S\s]*?(480[p|i]|576[p|i]|720[p|i]|1080[p|i]|2160[p|i]|UHD|FHD|4K|3D|HDTV|HDCAM|DVB|DVD|HBO|AMZN|NF|HULU|AC3|HDRip|PAL|NTSC|BRRip|BDRip|BluRay|Blu-Ray|BDRemux|WEB|XviD|AVC|HEVC|[x|h]264|[x|h]265)/i);
							if(!is_series) is_series=title.match(/([\s\S]*?)[\.|\s]Season[\s]([\d][\d])[\S\s]*?(480[p|i]|576[p|i]|720[p|i]|1080[p|i]|2160[p|i]|UHD|FHD|4K|3D|HDTV|HDCAM|DVB|DVD|HBO|AMZN|NF|HULU|AC3|HDRip|PAL|NTSC|DVDRip|BRRip|BDRip|BluRay|Blu-Ray|BDRemux|WEB|XviD|AVC|HEVC|[x|h]264|[x|h]265)/i);
							if(!is_series) is_series=title.match(/([\s\S]*?)[\.|\s]Season[\s]([\d])[\S\s]*?(480[p|i]|576[p|i]|720[p|i]|1080[p|i]|2160[p|i]|UHD|FHD|4K|3D|HDTV|HDCAM|DVB|DVD|HBO|AMZN|NF|HULU|AC3|HDRip|PAL|NTSC|DVDRip|BRRip|BDRip|BluRay|Blu-Ray|BDRemux|WEB|XviD|AVC|HEVC|[x|h]264|[x|h]265)/i);
							if(!is_series) is_series=title.match(/([\s\S]*?)[\.|\s]Season[\s]([\d][\d])/i);
							if(!is_series) is_series=title.match(/([\s\S]*?)[\.|\s]Season[\s]([\d])/i);
							if(is_series)
							{
								if(is_series[3])
									title=is_series[1]+" - Season "+parseInt(is_series[2])+" "+mytext.color("  ("+is_series[3]+") ", 'A0A0A0', "+2");
								else
									title=is_series[1]+" - Season "+parseInt(is_series[2]);
								title_base=is_series[1].trim();
								season=parseInt(is_series[2]);
								episode=99;
							}
							else // YYYY
							{
								is_series=title.match(/([\s\S]*?)[\.|\s|\(]([\d]{4}).([\d]{2}).([\d]{2})[\.\s\S]*?(480[p|i]|576[p|i]|720[p|i]|1080[p|i]|2160[p|i]|UHD|FHD|4K|3D|HDTV|HDCAM|DVB|DVD|HBO|AMZN|NF|HULU|AC3|HDRip|PAL|NTSC|BRRip|BDRip|BluRay|Blu-Ray|BDRemux|WEB|XviD|AVC|HEVC|[x|h]264|[x|h]265)/i);
								if(is_series)
								{
										title=is_series[1]+" ("+is_series[2]+"-"+is_series[3]+"-"+is_series[4]+") "+mytext.color(" ("+is_series[5]+")", 'A0A0A0', "+2");
										title_base=is_series[1].trim();
										year=parseInt(is_series[2]);
								}
								else
								{
									is_series=title.match(/([\s\S]*?)[\.|\s|\(]([\d]{4})[^p^i][\.\s\S]*?(480[p|i]|576[p|i]|720[p|i]|1080[p|i]|2160[p|i]|UHD|FHD|4K|3D|HDTV|HDCAM|DVB|DVD|HBO|AMZN|NF|HULU|AC3|HDRip|PAL|NTSC|BRRip|BDRip|BluRay|Blu-Ray|BDRemux|WEB|XviD|AVC|HEVC|[x|h]264|[x|h]265)/i);
									if(is_series)
									{
										title=is_series[1]+mytext.color("  ("+is_series[3]+") ", 'A0A0A0', "+2");
										title_base=is_series[1].trim();
										year=parseInt(is_series[2]);
									}
									else
									{
										is_series=title.match(/([\s\S]*?)[\:|\/|\.|\(|\?|\-|\–]/i);
										if(is_series)
											title_base=is_series[1].trim();
									}
								}
							}
						}
					}

					var tagline = match[2].replace("[eztv]", "").trim();

					title = title.replace(/[\d]{4}\s/, "");
					title_base = title_base.replace(/\s[\d]{4}/, "");

					if(tagline.indexOf("265")>0)
						title+=mytext.color("  (x265) ", 'AAAAAA', "+2");

					var itemUrl = match[4];
					
					if(itemUrl.length<4)
						continue;

					icon = res_path+"logo.png";
					var poster = match[1].split('/');
					var backdrop = tey.etv.baseURL+"/ezimg/thumbs/"+poster[3].replace(/\-[\d]{4}/, "")+"-"+poster[2]+".jpg";
					backdrop = backdrop.replace("-au-", "-").replace("-uk-", "-").replace("-us-", "-");

					if(season<0 || poster[2]=="1911")
					{
						if(tagline.indexOf("...")>0)
						{
							if(title.indexOf("720")>0 || title.indexOf("1080")>0)
								icon = res_path+"hd-series.gif";
							else
								icon = res_path+"sd-series.gif";
						}
						else
							icon = tey.etv.baseURL+"/ezimg/thumbs/"+tagline.toLowerCase().replace(/\s/g, "-")+"-small.jpg";
					}
					else
					{
						icon = backdrop;
					}

					var peers = match[7].replace(/<font color=\"green\">/g, '').replace(/<\/font>/g, '').trim();

					if(peers!='-')
					{

						var entry = {
							title: title,
							icon: icon,
							tagline: tagline,
							url: itemUrl
						};
						
						url_id = itemUrl.substr(itemUrl.lastIndexOf("/")+1, 32);
						
						g_entry[url_id] = entry;
						
						var item = page.appendItem(Plugin.id + ':entry:'+url_id+":tey-etv",
							'video', {
							title: new mytext.RichText(title),
							icon: icon,
							description: new mytext.RichText(
								mytext.color('Seeds: ', 'FFA500') + peers + 
								mytext.color('\nSize: ', 'FFA500') + match[5] +
								mytext.color('\nAdded: ', 'FFA500') + match[6] + ' ago'
							),
							backdrops: [ 
									{url: backdrop}
							],
							tagline: tagline,
							ctitle: new mytext.RichText(mytext.color("Seeds: "+peers+" ("+match[5]+")", 'AAAAAA', 2))
						});

						if(poster[2]!="1911")
							item.addOptURL("View The Show '" + title_base + "'", PREFIX+':search3:'+"?q2="+poster[2]+":"+title_base, "search");

						item.addOptURL("Search for '" + title_base + "'", PREFIX+':search3:'+title_base+":"+title_base, "search");
						if(season>0 && episode>0)
						{
							if(episode<10) episode = "0"+episode;
							if(season<10) season = "0"+season;

							item.addOptURL("Search for '" + title_base + " S"+season+"E"+episode+"'", PREFIX+':search3:'+title_base+" S"+season+"E"+episode+":"+title_base, "search");
						}
						item.addOptURL("Zamunda", 'pluginsBG:znt:search:'+title_base, "search");
						item.addOptURL("ArenaBG", 'pluginsBG:abg:search:'+title_base, "search");
						item.addOptURL("Zelka", 'pluginsBG:zse:search:'+title_base, "search");
						item.addOptURL("YTS", tey.yts.prefix + ':search:'+title_base, "search");
						item.addOptURL("Everywhere", 'search:'+title_base, "search");
						
						if(tey.sync && data_hist["sync_user"])
						{
							item.k1 = g_entry[url_id].title;
							item.k2 = g_entry[url_id].icon;
							item.k3 = 'torrent:browse:' + g_entry[url_id].url+"?tey-etv";

							item.addOptAction("Добави в Последно Гледани", function ()
								{
									watch_history('add', this.k1, this.k2, this.k3 ); 
									hist_func(); 
									popup.notify("Готово!", 3);
								}.bind(item), "add");
						}
						page.entries++;
						added++;
						if(search && search.indexOf("q2=")<0 && page.entries>1000) 
						{
							found = false;
							page.loading = false;
							return false;
							break;
						}
					}
					count++;
					if(count>99)
					{
							count = 0;
							page.loading = false;
							return true;
					}
				}
				if(search) {found = false; break;}
			}

			if(!added)
				 page.appendItem("", "separator", {
					title: new mytext.RichText(mytext.color('No results', 'FFA500', "+2"))
				 });
            page.loading = false;
            return found;
        }
        
        loader();
        page.paginator = loader;
    }
    
    new movian_page.Route(PREFIX + ":start", function(page) {
        setPageHeader(res_path, page, manifest.title);
		page.metadata.glwview =  res_path + "list.view";

        page.options.createAction('update', "Update ezTV", function() 
		{
			popup.notify("Updating, please wait...", 3);
			page.redirect('http://api2.deanbg.com/torrents.zip');
        });
		
		page.appendItem(PREFIX + ":search2:", 'search', {
			title: ''
		});

		if(tey.sync && data_hist["sync_user"])
		{
			page.appendItem("pluginsBG:hist:"+data_hist["sync_user"]+":"+data_hist["sync_profile"], "directory", {
				icon: logo,
				title: 'Последно Гледани'
			});
		}

		page.appendItem(PREFIX + ":shows:-1:-1", 'video', {
			icon: logo,
			title: 'Select a Show',
			ctitle: new mytext.RichText(mytext.color("Search or select a show", 'AAAAAA', 2))
		});

		try
		{
			if(!all_shows)
				all_shows = JSON.parse(http.request(tey.etv.baseURL+"/js/search_shows2.js").toString().match(/data[\s]*?=[\s]*?(\[[\s\S]*?\]);[\s]*?\$/)[1]);			
		}
		catch (err){popup.notify("Unable to load ezTV show list", 5);}

        browseItems(page);
    });
    

	new movian_page.Route(PREFIX + ":shows:(.*):(.*)", function(page, first, second) {
        setPageHeader(res_path, page, 'Shows');
		page.type = "directory";
        page.contents = "movies";

		if(first=="-1")
		{
			page.appendItem(PREFIX + ":search2:", 'search', {
				title: ''
			});

			page.appendItem(PREFIX + ":shows:0:9", "directory", {
				icon: logo,
				title: '0-9'
			});
			var abc="ABCDEFGHIJKLMNOPQRSTUVWXYZ";
			for(var i=0; i<abc.length; i++)

			page.appendItem(PREFIX + ":shows:"+abc[i]+":"+abc[i], "directory", {
				icon: logo,
				title: abc[i]
			});
		}
		else
		{
			if(!all_shows) all_shows = JSON.parse(http.request(tey.etv.baseURL+"/js/search_shows2.js").toString().match(/data=(\[[\s\S]*?\]);\$/)[1]);
			var shows = all_shows;
			for(i=0; i<shows.length; i++)
			{
				if(shows[i].text[0] >= first && shows[i].text[0] <= second)
				{
					page.appendItem(PREFIX+':search3:'+"?q2="+shows[i].id+":"+escape(shows[i].text), "directory", {
						icon: logo,
						title: shows[i].text
					});
				}
			}
		}
    });

	new movian_page.Route(PREFIX + ":search2:(.*)", function(page, title) {
		setPageHeader(res_path, page, 'ezTV Shows Matching ('+title+')');
		page.type = "directory";
        page.contents = "movies";
		if(!all_shows) all_shows = JSON.parse(http.request(tey.etv.baseURL+"/js/search_shows2.js").toString().match(/data=(\[[\s\S]*?\]);\$/)[1]);
		var shows = all_shows;
			for(i=0; i<shows.length; i++)
			{
				if(shows[i].text.toUpperCase().indexOf(title.toUpperCase())>=0)
				{
					page.appendItem(PREFIX+':search3:'+"?q2="+shows[i].id+":"+escape(shows[i].text), "directory", {
						icon: logo,
						title: shows[i].text
					});
				}
			}
	});	

	new movian_page.Route(PREFIX + ":search3:(.*):(.*)", function(page, title, title2) {
		setPageHeader(res_path, page, unescape(title2));
        browseItems(page, title);
	});

	new movian_page.Route(PREFIX + ":search:(.*)", function(page, title) {
		setPageHeader(res_path, page, 'ezTV');
		if(tey.sync && data_hist["sync_user"])
		{
			page.options.createAction('addsearch', "Запази търсенето", function() 
			{
				watch_history("add", title, null, PREFIX + ":search:" + title);
				page.redirect(PREFIX + ":search:"+title);
			});						
		}		
        browseItems(page, title);
	});

    new movian_page.Searcher(manifest.title, logo, function(page, search) {
        browseItems(page, search);
    });


}) (this);

(function(yts) {
	
	var manifest = tey.yts;

/**
 * YTS plugin for Movian Media Center
 *
 *  Copyright (C) 2015-2018 lprot
 *  Copyright (C) 2018-2023 dean
 *
 */

    var PREFIX		= manifest.prefix;
	var res_path	= Plugin.path + "res/" + manifest.id + "/";

	var logo		= res_path + "logo.png";

var service = movian_service.create(manifest.title, PREFIX + ":start", "video", true, logo);

var genres = [
    "Action", "Adventure", "Animation", "Biography", "Comedy", "Crime",
    "Documentary", "Drama", "Family", "Fantasy", "Film-Noir", "History",
    "Horror", "Music", "Musical", "Mystery", "Romance", "Sci-Fi", "Short",
    "Sport", "Thriller", "War", "Western"];

function concat(what) {
    var s = 0;
    for (var i in what)
        (s ? s+= ', ' + what[i] : s = what[i]);
    return s;
}

function concatEntity(entity, field) {
    var s = 0;
    for (var i in entity)
        (s ? s += ', ' + entity[i][field] : s = entity[i][field]);
    return s;
}

function browseItems(page, query, count) {
    var offset = 1;
    page.entries = 0;

    function loader() {
        if (!offset) return false;
        page.loading = true;

        var args = {
            limit: 40,
            page: offset,
            quality: tey.yts.quality,
            sort_by: tey.yts.sorting,
            order_by: tey.yts.order
        };
        for (var i in query)
            args[i] = unescape(query[i]);

        try {
            var c = JSON.parse(http.request(tey.yts.baseUrl + '/api/v2/list_movies.json', {
                args: args
            }));
        } catch(err) {
            page.error('API Error: '+err);
            return;
        }

        page.loading = false;
        if (offset == 1 && page.metadata && c.data.movie_count)
            page.metadata.title;
        for (var i in c.data.movies) {
            addMovieItem(page, c.data.movies[i]);
            if (count && page.entries > count) return offset = false;
        }
        offset++;
        return c.data.movies && c.data.movies.length > 0;
    }
    loader();
    page.paginator = loader;
    page.loading = false;
}

new movian_page.Route(PREFIX + ":genre:(.*)", function(page, genre) {
    setPageHeader(res_path, page, genre);
	page.metadata.glwview =  res_path + "list.view";
    browseItems(page, {
        genre: genre
    });
    page.loading = false;
});

new movian_page.Route(PREFIX + ":genres", function(page, genre) {
    setPageHeader(res_path, page, 'Genres');
	page.metadata.glwview =  res_path + "list.view";
    for(var i in genres) {
        var item = page.appendItem(PREFIX + ":genre:" + genres[i], "directory", {
            title: genres[i]
        });
    }
    page.loading = false;
});

new movian_page.Route(PREFIX + ":newest", function(page) {
    setPageHeader(res_path, page, 'Newest');
	page.metadata.glwview =  res_path + "list.view";
    browseItems(page, {
        sort: 'peers'
    });
    page.loading = false;
});

function constructMultiopt(multiOpt, storageVariable) {
    var t = [
        ['ALL', 'All'],
        ['1080p', '1080p'],
        ['720p', '720p'],
        ['3D', '3D']
    ];
    if (!storageVariable)
        multiOpt[0][2] = true;
    else
        for (var i = 0; i < multiOpt.length; i++) {
            if (multiOpt[i][0] == storageVariable) {
                multiOpt[i][2] = true;
                break;
            }
        }
    return multiOpt;
}

function addOptions(page) {
    var optionsAreAdded = false;
    var options = constructMultiopt([['ALL', 'All'],
        ['1080p', '1080p'],
        ['720p', '720p'],
        ['3D', '3D']], tey.yts.quality);
    page.options.createMultiOpt('filter', "Filter quality by", options, function(v) {
        tey.yts.quality = v;
        if (optionsAreAdded) {
            page.flush();
            processStartPage(page);
        }
    });

    options = constructMultiopt([
        ['date_added', 'Date'],
        ['seeds', 'Seeds'],
        ['peers', 'Peers'],
        ['like_count', 'Like Count'],
        ['title', 'Title'],
        ['rating', 'Rating'],
        ['downloaded_count', 'Downloaded Count'],
        ['year', 'Year']], tey.yts.sorting);
    page.options.createMultiOpt('sorting', "Sort results by", options, function(v) {
        tey.yts.sorting = v;
        if (optionsAreAdded) {
            page.flush();
            processStartPage(page);
        }
    });

    options = constructMultiopt([
        ['desc', 'Descending'],
        ['asc', 'Ascending']], tey.yts.order);
    page.options.createMultiOpt('order', "Order by", options, function(v) {
        tey.yts.order = v;
        if (optionsAreAdded) {
            page.flush();
            processStartPage(page);
        }
    });
    optionsAreAdded = true;
}

function processStartPage(page) {
    page.appendItem(PREFIX + ":genres", "directory", {
        title: 'Genres',
		icon: logo,
    });

	if(tey.sync && data_hist["sync_user"])
	{
		page.appendItem("pluginsBG:hist:"+data_hist["sync_user"]+":"+data_hist["sync_profile"], "directory", {
			icon: logo,
			title: 'Последно Гледани'
		});
	}
	
    page.appendItem("", "separator", {
        title: 'Latest'
    });
    browseItems(page, {
        sort: 'date'
    }, 7);
    page.appendItem(PREFIX + ':newest', 'directory', {
        title: 'More ►'
    });
    page.loading = false;
}

new movian_page.Route(PREFIX + ":start", function(page) {
    setPageHeader(res_path, page, manifest.title);
	page.metadata.glwview =  res_path + "list.view";
    page.appendItem(PREFIX + ":search:", 'search', {
        title: 'Search'
    });
    addOptions(page);
    processStartPage(page);
});

new movian_page.Route(PREFIX + ":list:(.*)", function(page, query) {
    setPageHeader(res_path, page, 'Filter by: ' + unescape(query));
	page.metadata.glwview =  res_path + "list.view";
    browseItems(page, {
        query_term: query
    });
    page.loading = false;
});

function addMovieItem(page, mov) {
    var item = page.appendItem(PREFIX + ':movie:' + mov.id, "video", {
        title: new mytext.RichText(mov.title + ' ' + mytext.color('('+mov.year+')', 'b0b0b0') + ' ' + mytext.color('('+concatEntity(mov.torrents, 'quality')+')', "808080", "+2")),
        icon: mov.medium_cover_image,
        year: +mov.year,
        rating: mov.rating * 10,
        duration: +mov.runtime,
        genre: concat(mov.genres),
        description: new mytext.RichText(mytext.color('Seeds: ', orange) + mytext.color(concatEntity(mov.torrents, 'seeds'), green) +
            mytext.color('\nPeers: ', orange) + mytext.color(concatEntity(mov.torrents, 'peers'), red) + ' ' +
            mytext.color('\nUploaded: ', orange) + concatEntity(mov.torrents, 'date_uploaded') +
            mytext.color('\nSize: ', orange) + concatEntity(mov.torrents, 'size') +
            mytext.color('\nMPA rating: ', orange) + mov.mpa_rating +
            mytext.color('\nLanguage: ', orange) + mov.language +
            mytext.color('\nState: ', orange) + mov.state
        )
    });
    page.entries++;
}

new movian_page.Route(PREFIX + ":movie:(.*)", function(page, id) {
    page.loading = true;
    var json = JSON.parse(http.request(tey.yts.baseUrl + '/api/v2/movie_details.json?movie_id=' + id + '&with_images=true&with_cast=true'));
    setPageHeader(res_path, page, json.data.movie.title_long);
	//page.metadata.glwview =  res_path + "list.view";
    if (page.metadata.background && json.data.movie.background_image) {
        page.metadata.background = json.data.movie.background_image;
        page.metadata.backgroundAlpha = 0.3;
    }
    for (var i in json.data.movie.torrents) {
        var link = json.data.movie.torrents[i].url.match(/(\/torrent\/download(.*))/);
        if (link)
            link = tey.yts.baseUrl.replace('/api/', '') + link[1];
        else
            link = json.movie.torrents[i].url;
        var vparams = "videoparams:" + JSON.stringify({
            title: json.data.movie.title,
            canonicalUrl: PREFIX + ':movie:' + id + ':' + json.data.movie.torrents[i].quality,
            imdbid: json.data.movie.imdb_code,
            no_fs_scan: true,
			image: json.data.movie.medium_screenshot_image1,
			description: json.data.movie.description_full ? json.data.movie.description_full : "",
            sources: [{
                url: 'torrent:video:' + link
            }]
        });

        var item = page.appendItem(vparams, "video", {
            title: new mytext.RichText(mytext.color(json.data.movie.torrents[i].quality, orange) + ' ' + json.data.movie.title),
            year: +json.data.movie.year,
            duration: json.data.movie.runtime * 60,
            rating: +json.data.movie.rating * 10,
            icon: json.data.movie.medium_cover_image,
            genre: concat(json.data.movie.genres),
            backdrops: [{url: json.data.movie.large_screenshot_image1},{url: json.data.movie.large_screenshot_image2},{url: json.data.movie.large_screenshot_image3}],
            tagline: new mytext.RichText(mytext.color('Seeds: ', orange) + mytext.color(json.data.movie.torrents[i].seeds, green) +
            mytext.color(' Peers: ', orange) + mytext.color(json.data.movie.torrents[i].peers, red) + ' ' +
                (json.data.movie.like_count ? mytext.color('Likes: ', orange) + json.data.movie.like_count : '') +
                (json.data.movie.download_count ? mytext.color(' Downloads: ', orange) + json.data.movie.download_count : '') +
                (json.data.movie.mpa_rating ? mytext.color(' MPA rating: ', orange) + json.data.movie.mpa_rating : '')),
            description:  new mytext.RichText(mytext.color('Language: ', orange) + json.data.movie.language +
                mytext.color(' Added: ', orange) + json.data.movie.torrents[i].date_uploaded +
                (json.data.movie.torrents[i].resolution ? mytext.color('<br>Resolution: ', orange) + json.data.movie.torrents[i].resolution + 'x' + json.data.movie.torrents[i].framerate + 'fps' : '') +
                mytext.color(' Size: ', orange) + json.data.movie.torrents[i].size +
                (json.data.movie.description_full ? '<br>' + json.data.movie.description_full : ''))
        });
			item.addOptURL('Browse', "torrent:browse:"+ link, 'arrow_forward');

			if(tey.sync && data_hist["sync_user"])
			{
				item.k1 = json.data.movie.title+" ("+json.data.movie.year+") "+mytext.color("("+json.data.movie.torrents[i].quality+")", "C0C0C0", "+2");
				item.k2 = json.data.movie.medium_cover_image;
				item.k3 = 'torrent:browse:' + link + "?tey-yts";

				item.addOptAction("Добави в Последно Гледани", function ()
					{
						watch_history('add', this.k1, this.k2, this.k3 ); 
						hist_func(); 
						popup.notify("Готово!", 3);
					}.bind(item), "add");
			}
		
			
    }
    if (json.data.movie.yt_trailer_code)
        page.appendItem('ytp:video:'+escape(json.data.movie.yt_trailer_code), "video", {
            title: 'Trailer',
            icon: json.data.movie.medium_cover_image
        });
    if (json.data.movie.large_cover_image)
        page.appendItem(json.data.movie.large_cover_image, "image", {
            title: 'Cover'
        });
    if (json.data.movie.large_screenshot_image1)
        page.appendItem(json.data.movie.large_screenshot_image1, "image", {
            title: 'Screenshot1'
        });
    if (json.data.movie.large_screenshot_image2)
        page.appendItem(json.data.movie.large_screenshot_image2, "image", {
            title: 'Screenshot2'
        });
    if (json.data.movie.large_screenshot_image3)
        page.appendItem(json.data.movie.large_screenshot_image3, "image", {
            title: 'Screenshot3'
        });
    if (json.data.movie.cast) {
        page.appendItem("", "separator", {
            title: 'Actors:'
        });
        for (var i in json.data.movie.cast) {
            page.appendPassiveItem('video', '', {
                title: json.data.movie.cast[i].name + ' as ' + json.data.movie.cast[i].character_name,
                icon: json.data.movie.cast[i].url_small_image
            });
        }
    }

    if (json.data.movie.directors) {
        page.appendItem("", "separator", {
            title: 'Directors:'
        });
        for (var i in json.data.movie.directors) {
            page.appendItem(PREFIX + ':list:' + escape(json.data.directors[i].name), "video", {
                title: json.data.directors[i].name,
                icon: json.data.directors[i].medium_image
            });
        }
    }

    // Suggestions
    try {
        json = JSON.parse(http.request(tey.yts.baseUrl + '/api/v2/movie_suggestions.json?movie_id=' + id));
        var first = true;
        for (var i in json.data.movies) {
            if (first) {
                page.appendItem("", "separator", {
                    title: 'Suggestions:'
                });
                first = false;
            };
            addMovieItem(page, json.data.movies[i]);
        }
    } catch(err) {}

    // Comments
    try {
        json = JSON.parse(http.request(tey.yts.baseUrl + '/api/v2/movie_comments.json?movie_id=' + id));
        first = true;
        for (var i in json.data.comments) {
            if (first) {
                page.appendItem("", "separator", {
                    title: 'Comments:'
                });
                first = false;
            };
            page.appendPassiveItem('video', '', {
                title: new mytext.RichText(mytext.color(json.data.comments[i].username, orange) + ' (' + json.data.comments[i].date_added + ')'),
                icon: json.data.comments[i].medium_user_avatar_image,
                description: new mytext.RichText(json.data.comments[i].comment_text +
                    mytext.color('\nLike Count: ', orange) + json.data.comments[i].like_count)
            });
        }
    } catch(err) {}
    page.loading = false;
});

new movian_page.Route(PREFIX + ":search:(.*)", function(page, query) {
    setPageHeader(res_path, page, manifest.title);
	page.metadata.glwview =  res_path + "list.view";
	if(tey.sync && data_hist["sync_user"])
	{
		page.options.createAction('addsearch', "Запази търсенето", function() 
		{
			watch_history("add", query, null, PREFIX + ":search:" + query);
			page.redirect(PREFIX + ":search:"+query);
		});						
	}	
    browseItems(page, {
        query_term: query
    });
});

new movian_page.Searcher(manifest.title, logo, function(page, query) {
    browseItems(page, {
        query_term: query
    });
});
	
	
}) (this);

(function(tgx) {

	var manifest = tey.tgx;

/*
 *  tGX plugin for Movian Media Center
 *
 *  Copyright (C) 2017-2023 dean
 */

    var PREFIX		= manifest.prefix;
	var res_path	= Plugin.path + "res/" + manifest.id + "/";

	var logo		= res_path + "logo.png";
	var logo_srch	= res_path + "search.png";
	var categories	= "";
	var search_order= "&sort=id&order=desc";

	var genres = [
		["All Series",	"c41=1&c5=1&c6=1&c11=1",	"hd-series.gif"],
		["HD Series",	"c41=1&c11=1",		"hd-series.gif"],
		["SD Series",	"c5=1", 		"sd-series.gif"],
		["HD Movies",	"c42=1", 		"hd-movies.gif"],
		["SD Movies",	"c1=1&c4=1", 	"sd-movies.gif"],
		["4K Movies",	"c3=1",			"4k-movies.svg"],
		["Animation",	"c28=1", 		"animation.gif"],
		["HD Concerts",	"c25=1", 		"hd-concerts.gif"],
		["Music",		"c22=1",		"music.gif"],
		["Sports",		"c7=1",			"hd-sports.gif"],
		["XXX",			"c34=1&c35=1&c47=1",			"xxx.gif"],
		["Documentaries","c9=1", 		"documentaries.gif"],
	];


    var service = movian_service.create(manifest.title, PREFIX + ":start", "video", true, logo);


	function search(page, query, count)
	{

		if(query.indexOf(".NF.")==0 || query.indexOf(".AMZN.")==0 || query.indexOf(".HULU.")==0)
	        browseItems(page, "search="+query.replace(/\s/g, "+")+"&"+categories+"sort=2&field=descr", count);
		else
	        browseItems(page, "search="+query.replace(/\s/g, "+")+"&sort=2", count);
	}

	function addOpt(page, item)
	{
		item.addOptURL("Search for '" + item.title + "'", PREFIX + ':search:'+item.title, "search");
		item.addOptURL("Zamunda", 'pluginsBG:znt:search:'+item.title, "search");
		item.addOptURL("ArenaBG", 'pluginsBG:abg:search:'+item.title, "search");
		item.addOptURL("Zelka", 'pluginsBG:zse:search:'+item.title, "search");
		item.addOptURL("YTS", tey.yts.prefix + ':search:'+item.title, "search");
		item.addOptURL("ezTV", tey.etv.prefix + ':search:'+item.title, "search");
		item.addOptURL("Everywhere", 'search:'+item.title, "search");
	}

    function browseItems(page, query, count) 
	{
		page.loading = true;
        var offset = 0;
		var found = 0;
		var c_page = 0;
		var skipped = 0;
		var	cat=categories;
		var doc=null;
		var date=0;
		var is_search = (query.substr(0, 6)=="search");
		if(query!="latest" && query.length) 
		{
			if(is_search && query.indexOf("field=desc")<0)
				cat+=query;
			else
				cat=query;
		}

		var re		= /hovercoverimg\\\' src=\\\'([\S\s]*?)\\\'[\s\S]*?torrents\.php\?cat=([\d]+)"[\s\S]*?<small>([\S\s]*?)<\/small>[\s\S]*?title="([\s\S]*?)"[\s\S]*?href="\/torrent\/([\d]+)\/[\s\S]*?a href='(http[\s\S]*?)'[\s\S]*?(magnet:[\s\S]*?)"[\s\S]*?'border-radius:4px;'>([\s\S]*?)<[\s\S]*?Leechers[\s\S]*?<b>([\d]+)<\/b>[\s\S]*?<b>([\d]+)<\/b>[\s\S]*?text-align:right'>([\S\s]*?)<\/div>/g;

        function appendItems() 
		{
			var url='';
			var icon='';
			var genre='';
			var title='';
			var descr='';
			var title_base='';
			var tagline='';
			var year=null;
			var season=0;
			var episode=0;
			var backdrp = [];
			var item;
			var dur=0;

			var match = re.exec(doc);

			if(match==null) return false;

            while (match) 
			{
				found++;
				url=match[6];
				icon=match[1];


/*
1 image
2 cat-id
3 cat-name
4 title
5 url-id
6 torrent
7 magnet
8 size
9 seed
10 peer
11 date
*/
				seeder=match[9].trim();
				leecher=match[10].trim();
				genre=match[3].replace("&nbsp", "")+"\nAdded: "+mytext.color(match[11], white)+"<br>"+mytext.color("Size: ", orange)+mytext.color(match[8], white)+"<br>"+mytext.color("Peers: ", orange)+mytext.color(seeder+"/"+leecher, white);
				ctitle="Peers: "+seeder+"/"+leecher+" ("+match[8]+")";
				title=match[4].replace(/\./g, " ").replace(/_/g, " ").replace(/<[^>]*>/g, '').replace(/\s\s/g, " ").replace("[TGx]", "");
				tagline=title;
				descr=title;

				if(icon.indexOf("http")<0) icon = tey.tgx.baseURL + icon;

				dur=0;
				backdrp = [];
				title_base="";
				year=null;
				season=0;
				episode=0;


				var is_series=title.match(/([\s\S]*?)[\.|\s][S|s]([\d][\d])[E|e]([\d][\d])[\S\s]*?(480[p|i]|576[p|i]|720[p|i]|1080[p|i]|2160[p|i]|UHD|FHD|4K|3D|HDTV|HDCAM|DVB|DVD|HBO|HDRip|PAL|NTSC|DVDRip|BRRip|BDRip|BluRay|Blu-Ray|BDRemux|WEB|XviD|AVC|HEVC|AMZN|NF|DSNP|HULU|MP4|[x|h]264|[x|h]265)/i);
				if(is_series) // S00E00 -> 00x00
				{
					title=is_series[1]+" "+is_series[2]+"x"+is_series[3]+mytext.color(" ("+is_series[4]+")", 'A0A0A0', "+2");
					title_base=is_series[1].trim();
					season=parseInt(is_series[2]);
					episode=parseInt(is_series[3]);
				}
				else
				{
					is_series=descr.match(/([\s\S]*?)[\.|\s][S|s]([\d][\d])[E|e]([\d][\d])/i);
					if(!is_series) is_series=title.match(/([\s\S]*?)[\.|\s][S|s]([\d][\d])[E|e]([\d][\d])/i);
					if(!is_series) is_series=descr.match(/([\s\S]*?)[\.|\s]([\d][\d])[x|X]([\d][\d])/i);
					if(!is_series) is_series=title.match(/([\s\S]*?)[\.|\s]([\d][\d])[x|X]([\d][\d])/i);
					if(is_series) // S00E00 -> 00x00
					{
						title=is_series[1]+" "+is_series[2]+"x"+is_series[3];
						title_base=is_series[1].trim();
						season=parseInt(is_series[2]);
						episode=parseInt(is_series[3]);
					}
					else
					{
						is_series=title.match(/([\s\S]*?)[\.|\s][S|s]([\d][\d])[\S\s]*?(480[p|i]|576[p|i]|720[p|i]|1080[p|i]|2160[p|i]|UHD|FHD|4K|3D|HDTV|HDCAM|DVB|DVD|HBO|HDRip|PAL|NTSC|DVDRip|BRRip|BDRip|BluRay|Blu-Ray|BDRemux|WEB|XviD|AVC|HEVC|AMZN|NF|DSNP|HULU|MP4|[x|h]264|[x|h]265)/i);
						if(!is_series) is_series=title.match(/([\s\S]*?)[\.|\s]Season[\s]([\d][\d])[\S\s]*?(480[p|i]|576[p|i]|720[p|i]|1080[p|i]|2160[p|i]|UHD|FHD|4K|3D|HDTV|HDCAM|DVB|DVD|HBO|HDRip|PAL|NTSC|DVDRip|BRRip|BDRip|BluRay|Blu-Ray|BDRemux|WEB|XviD|AVC|HEVC|AMZN|NF|DSNP|HULU|MP4|[x|h]264|[x|h]265)/i);
						if(!is_series) is_series=title.match(/([\s\S]*?)[\.|\s]Season[\s]([\d])[\S\s]*?(480[p|i]|576[p|i]|720[p|i]|1080[p|i]|2160[p|i]|UHD|FHD|4K|3D|HDTV|HDCAM|DVB|DVD|HBO|HDRip|PAL|NTSC|DVDRip|BRRip|BDRip|BluRay|Blu-Ray|BDRemux|WEB|XviD|AVC|HEVC|AMZN|NF|DSNP|HULU|MP4|[x|h]264|[x|h]265)/i);
						if(!is_series) is_series=title.match(/([\s\S]*?)[\.|\s]Season[\s]([\d][\d])/i);
						if(!is_series) is_series=title.match(/([\s\S]*?)[\.|\s]Season[\s]([\d])/i);
						if(is_series)
						{
							if(is_series[3])
								title=is_series[1]+" - Season "+parseInt(is_series[2])+" "+mytext.color(" ("+is_series[3]+")", 'A0A0A0', "+2");
							else
								title=is_series[1]+" - Season "+parseInt(is_series[2]);
							title_base=is_series[1].trim();
							season=parseInt(is_series[2]);
							episode=99;
						}
						else // YYYY
						{
							is_series=title.match(/([\s\S]*?)[\.|\s|\(]([\d]{4})[^p^i][\.\s\S]*?(480[p|i]|576[p|i]|720[p|i]|1080[p|i]|2160[p|i]|UHD|FHD|4K|3D|HDTV|HDCAM|DVB|DVD|HBO|HDRip|PAL|NTSC|DVDRip|BRRip|BDRip|BluRay|Blu-Ray|BDRemux|WEB|XviD|AVC|HEVC|AMZN|NF|DSNP|HULU|MP4|[x|h]264|[x|h]265)[\.\s]*?(480[p|i]|576[p|i]|720[p|i]|1080[p|i]|2160[p|i]|UHD|FHD|4K|3D|HDTV|HDCAM|DVB|DVD|HBO|HDRip|PAL|NTSC|DVDRip|BRRip|BDRip|BluRay|Blu-Ray|BDRemux|WEB|XviD|AVC|HEVC|AMZN|NF|DSNP|HULU|MP4|[x|h]264|[x|h]265)/i);
							if(is_series)
							{
								title=is_series[1]+mytext.color(" ("+is_series[3]+" "+is_series[4]+")", 'A0A0A0', "+2");
								title_base=is_series[1].trim();
								year=parseInt(is_series[2]);
							}
							else
							{
								is_series=descr.match(/([\s\S]*?)[\:|\/|\.|\(|\?|\-|\–]/i);
								if(!is_series) is_series=title.match(/([\s\S]*?)[\:|\/|\.|\(|\?|\-|\–]/i);
								if(is_series)
								{
									title=descr;
									title_base=is_series[1].trim();
								}
							}
						}
					}
				}

				title = title.replace(/[\d]{4}\s/, "");
				title_base = title_base.replace(/\s[\d]{4}/, "");

				descr = descr.trim();

				descr+="<hr>";
				if(title_base=="") title_base=title;

				item=null;

				title_base2 = title_base;
				if(season>0)
				{
					if(episode>0 && episode<99)
						title_base2 += " - "+season+"x"+(episode<10?"0":"")+episode;
					else
						title_base2 += " - Season "+season;
				}
				else
					if(year>1900 && year<2030)
					{
						title_base2 += " ("+year+")";
					}

				if(tagline.indexOf("265")>0)
					title+=mytext.color("  (x265) ", 'AAAAAA', "+2");

				if(year>1900 && year<2030)
				{
					title+=mytext.color("  ("+year+") ", 'AAAAAA', "+2");
				}
				
				var entry = {
					title: title,
					icon: icon,
					tagline: tagline,
					url: url
				};
				
				g_entry[match[5]] = entry; // url-id
				
				item = page.appendItem(Plugin.id + ':entry:'+match[5]+":tey-tgx",
					"video", {
						icon: icon,
						title: new mytext.RichText(title),
						tagline: tagline,
						year: year,
						ctitle: new mytext.RichText(mytext.color(ctitle, 'AAAAAA', 2)),
						description: new mytext.RichText(mytext.color(genre+(year>1900?mytext.color("\nYear: ", orange)+year:""), orange)),
					});

				item.date=date;

				if(title_base.length>2)
				{
					item.title=title_base;

					addOpt(page, item);

					if(tey.sync && data_hist["sync_user"])
					{
						item.k1 = g_entry[match[5]].title;
						item.k2 = g_entry[match[5]].icon;
						item.k3 = 'torrent:browse:' + g_entry[match[5]].url+"?tey-tgx";

						item.addOptAction("Добави в Последно Гледани", function ()
							{
								watch_history('add', this.k1, this.k2, this.k3 ); 
								hist_func(); 
								popup.notify("Готово!", 3);
							}.bind(item), "add");
					}
				}

				offset++;
				page.entries++;
				if(page.entries>10) page.loading = false;
				match = re.exec(doc);
				if(offset>=count) {return false;}

            }
			return true;
        }

        function loader() 
		{
			if(offset>=count) return false;
			ret = true;
			var c_page2=c_page+1;

			if(is_search) c_page2=c_page+1+(parseInt(50)+50)/50;

            page.loading = true;
			for (var i = c_page; i < (c_page2); i++) 
			{
				last_offset = offset;

				doc = http.request(tey.tgx.baseURL+"torrents.php?lang=0&nox=2&"+cat+"&page="+i+search_order, {
						headers: {'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36"},
						caching: tey.tgx.caching,
						compression: true,
						cacheTime: (tey.tgx.caching==true?3600:0),
					}).toString();

				appendItems();
				c_page++;

				if( (offset == last_offset) ) ret = false;
				if( query!="latest" && found<20 ) ret = false;

				if(offset>=count) ret = false;
				if(!ret) {offset = count+1; break;}
			}

			page.loading = false;
			return ret;
		}

		loader();
		page.paginator = loader;

        page.loading = false;
    }

	new movian_page.Route(PREFIX + ":genre:(.*)", function(page, genre) {
		setPageHeader(res_path, page, genres[genre][0], genres[genre][2]);
		page.flush();
		page.metadata.glwview =  res_path + "list.view";
		page.options.createMultiOpt('order', 'Order by', [
			['&sort=id&order=desc',		      'Date', true],
			['&sort=seeders&order=desc',      'Peers'],
			], function(order) {
				if(search_order!=order)
				{
					search_order = order;
					page.redirect(PREFIX + ":genre:"+genre);
				}
			}, true);
		browseItems(page, genres[genre][1], 1200);
	});

    new movian_page.Route(PREFIX + ":search:(.*)", function(page, title) {
		var icon=null;
		var title2=title;

		if(title==".NF.")	{title2="Netflix"; icon="netflix.png";}
		if(title==".AMZN.") {title2="Amazon"; icon="amazon.png";}
		if(title==".HULU.") {title2="Hulu"; icon="hulu.png";}

        setPageHeader(res_path, page, "Results for '"+title2+"':", icon);
		page.metadata.glwview =  res_path + "list.view";

		page.options.createMultiOpt('order', 'Order by', [
			['&sort=id&order=desc',		      'Date'],
			['&sort=seeders&order=desc',      'Peers', true],
			], function(order) {
				if(search_order!=order)
				{
					search_order = order;
					page.redirect(PREFIX + ":search:"+title);
				}
			}, true);
			
		if(tey.sync && data_hist["sync_user"])
		{
			page.options.createAction('addsearch', "Запази търсенето", function() 
			{
				watch_history("add", title2, null, PREFIX + ":search:" + title);
				page.redirect(PREFIX + ":search:"+title);
			});						
		}
		search(page, title, 1200);
    });

    new movian_page.Route(PREFIX + ":genres", function(page) {
        setPageHeader(res_path, page, 'Categories');
		page.flush();
        for(var i in genres) 
		{
            page.appendItem(PREFIX + ":genre:" + i, "directory", {
				title: genres[i][0],
				icon: res_path + genres[i][2]
            });
        }

		page.appendItem(PREFIX + ":search:.HULU.", "directory", {
			title: "Hulu",
			icon: res_path + "hulu.png"
		});

		page.appendItem(PREFIX + ":search:.AMZN.", "directory", {
			title: "Amazon",
			icon: res_path + "amazon.png"
		});

		page.appendItem(PREFIX + ":search:.NF.", "directory", {
			title: "Netflix",
			icon: res_path + "netflix.png"
		});

    });

    new movian_page.Route(PREFIX + ":latest", function(page) {
        setPageHeader(res_path, page, 'Latest');
		page.flush();
		page.metadata.glwview =  res_path + "list.view";
        browseItems(page, "latest", 1200);
    });

    function processStartPage(page) 
	{
		page.appendItem(PREFIX + ":search:", 'search', {
			title: 'Search'
		});

        page.appendItem(PREFIX + ":genres", "directory", {
			icon: logo,
            title: 'Categories'
        });

		if(tey.sync && data_hist["sync_user"])
		{
			page.appendItem("pluginsBG:hist:"+data_hist["sync_user"]+":"+data_hist["sync_profile"], "directory", {
				icon: logo,
				title: 'Последно Гледани'
			});
		}		

        page.appendItem("", "separator", {
			title: new mytext.RichText(mytext.color('Latest', orange, "+2"))
        });
        browseItems(page, "latest", 10);
        page.appendItem(PREFIX + ':latest', 'directory', {
			icon: logo,
            title: 'More... ►'
        });

        page.loading = false;
    }


    // Start page
    new movian_page.Route(PREFIX + ":start", function(page) 
	{
		page.metadata.glwview =  res_path + "list.view";

        setPageHeader(res_path, page, manifest.title);

		page.entries = 0;
		page.loading = true;

        page.options.createAction('update', "Update tGX", function() 
		{
			popup.notify("Updating, please wait...", 5);
			page.redirect('http://api2.deanbg.com/torrents.zip');
        });

		page.options.createMultiOpt('order', 'Order by', [
			['&sort=id&order=desc',		      'Date', true],
			['&sort=seeders&order=desc',      'Peers'],
			], function(order) {
				if(search_order!=order)
				{
					search_order = order;
					page.redirect(PREFIX + ":start");
				}
			}, true);

		categories="";
        for(var i in genres) 
			if(genres[i][0]!="XXX")
			categories+=genres[i][1]+"&";

        processStartPage(page);

		page.loading = false;

    });

    new movian_page.Searcher(manifest.title, logo, function(page, query) 
	{
		search(page, query, 50);
    });


}) (this);
