var RPATH = chrome.extension.getBackgroundPage().RPATH;
chrome.tabs.query({active: true, windowId: chrome.windows.WINDOW_ID_CURRENT}, function (tab)
{
    var currentTab = tab[0];
    var tabInformation = RPATH.getTab(currentTab.id);
        if (tabInformation)
        {
            $('.pathContainer').on("click", ".pathItem", function (e)
            {
                if ($(e.target).is('a.close'))
                {
                    e.preventDefault();
                    $('.pathItem').removeClass('expanded');
                    $('.pathResponseHeaders').slideUp('fast');
                }
                else if ($('.pathResponseHeaders', this).not(':visible').length > 0)
                {
                    $('.pathItem').removeClass('expanded');
                    $(this).addClass('expanded');
                    $('.pathResponseHeaders').slideUp('fast');
                    $('.pathResponseHeaders', this).slideDown('fast');
                }
            });
            $(tabInformation.path).each(function (idx, val)
            {
                var template = $('.template').clone();
                template.find('h2').html(val.url);
                var pageType = val.type;
                if (pageType == 'redirect')
                {
                    var redirectType = 'Temporary';
                    if (val.statusCode == 301)
                    {
                        redirectType = 'Permanent';
                    }
                    if (val.statusCode == 307)
                    {
                        redirectType = 'Internal (browser cached)';
                        $(val.responseHeaders).each(function (idx, header)
                        {
                            if (header.name == 'Non-Authoritative-Reason' && header.value == 'HSTS')
                            {
                                template.find('p#note').removeClass('hide');
                                template.find('p#note strong').html('The server has previously indicated this domain ' +
                                'should always be accessed via HTTPS (HSTS Protocol). Chrome has cached this internally, ' +
                                'and did not connect to any server for this redirect. Chrome reports this redirect as a ' +
                                '"307 Internal Redirect" however this probably would have been a ' +
                                '"301 Permanent redirect" originally. You can verify this by clearing your browser cache and ' +
                                'visiting the original URL again. ');
                            }
                        });
                    }
                    template.find('h3').html(val.statusCode + ': ' + redirectType + ' redirect to ' + val.redirectUrl);
                    template.addClass('redirect');
                }
                else if (val.statusCode == 404)
                {
                    template.find('h3').html(val.statusCode + ': This page is NOT FOUND');
                    template.addClass('notfound');
                }
                else if (val.statusCode == 503)
                {
                    var retryAfter = '';
                    if (typeof(val.responseHeaders) != 'undefined')
                    {
                        $(val.responseHeaders).each(function (idx, val)
                        {
                            if (val.name == 'Retry-After')
                            {
                                retryAfter = ' Retry after ' + val.value + ' seconds.';
                            }
                        });
                    }
                    template.find('h3').html(val.statusCode + ': Page temporarily unavailable.' + retryAfter);
                    template.addClass('error');
                }
                else if (val.statusCode >= 500)
                {
                    template.find('h3').html(val.statusCode + ': ' + val.statusLine);
                    template.addClass('error');
                }
                else if (val.statusCode >= 400)
                {
                    template.find('h3').html(val.statusCode + ': ' + val.statusLine);
                    template.addClass('notfound');
                }
                else if (val.statusCode >= 200)
                {
                    template.find('h3').html(val.statusCode + ': ' + val.statusLine);
                }
                else
                {
                    template.find('h3').remove();
                }
                var responseTemplate = template.find('.pathResponseHeaders li').clone();
                template.find('.pathResponseHeaders li').remove();
                var ipResponseTemplate = responseTemplate.clone();
                ipResponseTemplate.find('.responseKey').html('Server IP Address');
                ipResponseTemplate.find('.responseValue').html(val.ip);
                ipResponseTemplate.appendTo(template.find('.pathResponseHeaders'));
                if (typeof(val.responseHeaders) != 'undefined')
                {
                    $(val.responseHeaders).each(function (idx, val)
                    {
                        if (val.name != 'Set-Cookie')
                        {
                            var thisResponseTemplate = responseTemplate.clone();
                            thisResponseTemplate.find('.responseKey').html(val.name);
                            thisResponseTemplate.find('.responseValue').html(val.value);
                            thisResponseTemplate.appendTo(template.find('.pathResponseHeaders'));
                        }
                    });
                }
                template.removeClass('template').appendTo('.pathContainer');
            });
        }
        else
        {
            var template = $('.template').clone();
            template.find('h2').html('Sorry, there is currently no information available for this tab.');
            template.find('h3').html('Please load a URL to gather information on your path.');
            template.addClass('error');
            template.removeClass('template').appendTo('.pathContainer');
        }
});