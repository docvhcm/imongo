$(document).ready(function(){
    // docv
    $('.filtable').each(function(){
        var $this = $(this);
        var valueNames = ($this.data('search') || '').split(',');
        var list = new window.List($this[0], {
            valueNames: valueNames
        });
        $this.find('.clear').on('click', function(){
            list.search();
            $this.find('.search').val('');
        });
    });
    if(window.ace){
        $('.json-editor').each(function(){
            var editor = window.ace.edit($(this)[0]);
            editor.setOptions({
                maxLines: Infinity
            });
            editor.setTheme('ace/theme/github');
            editor.session.setMode('ace/mode/json');
            editor.setFontSize(14);
            editor.getSession().setUseWorker(false);
            editor.$blockScrolling = Infinity;
        });
    }
    $(document).on('click', '.item-addable .btn-add', function(){
        var $item = $(this).closest('.item-addable');
        $item.after($item.clone());
    });
    $(document).on('click', '.item-addable .btn-remove', function(){
        var $item = $(this).closest('.item-addable');
        if($item.parent().find('.item-addable').length > 1){
            $item.remove();
        }
    });
    $(document).on('click', '#newDocumentsAction', function(){
        var $modal = $(this).closest('.modal');
        var $jsonEditor = $modal.find('.json-editor');
        var editor = window.ace.edit($jsonEditor[0]);
        try{
            // convert BSON string to EJSON
            var ejson = toEJSON.serializeString(editor.getValue());
            var urlParts = [];
            urlParts.push($('#app_context').val());
            urlParts.push('document');
            urlParts.push($('#db_name').val());
            urlParts.push($('#coll_name').val());
            urlParts.push($('#edit_request_type').val());
            var url = urlParts.join('/');
            $.ajax({
                method: 'POST',
                contentType: 'application/json',
                url: url,
                data: JSON.stringify({'objectData': ejson})
            })
            .done(function(data){
                show_notification(data.msg, 'success');
                if(data.doc_id){
                    setInterval(function(){
                        // remove "new" and replace with "edit" and redirect to edit the doc
                        //window.location = window.location.href.substring(0, window.location.href.length - 3) + 'edit/' + data.doc_id;
                        window.location.reload();
                    }, 800);
                }
            })
            .fail(function(data){
                show_notification(data.responseJSON.msg, 'danger');
            });
        }catch(err){
            show_notification(err, 'danger');
        }
    });
    $(document).on('click', '.drop-index', function(e){
        e.preventDefault();
        e.stopPropagation();
        var href = $(this).attr('href');
        if(href.charAt(0) === '#'){
            dropIndex(Number(href.substr(1)));
        }
    });
    // end docv
    // paginate if value is set
    if($('#to_paginate').val() === 'true'){
        if(localStorage.getItem('message_text')){
            show_notification(localStorage.getItem('message_text'), 'success');
            localStorage.setItem('message_text', '');
        }
        paginate();
    }

    // checks localstorage for sidemenu being opened/closed state
    $('.mainMenu').each(function(index){
        var menu = $(this).text().trim().toString();
        if(window.localStorage.getItem(menu) === 'closed'){
            $(this).addClass('collapsed');
            $(this).nextUntil('.mainMenu').slideUp('fast');
        }
    });

    // inital stage of docs per page
    if(localStorage.getItem('docsPerPage')){
        $('#docsPerPage').val(localStorage.getItem('docsPerPage'));
    }

    // toggle the sidebar, resize the main view
    $(document).on('click', '#sidebarToggle', function(){
        $('.row-offcanvas').toggleClass('active');
        $('#sidebar').toggleClass('hidden-xs');
        $('#sidebar').toggleClass('hidden-sm');
        $('#sidebar').toggleClass('hidden-md');
        $('#sidebar').toggleClass('hidden-lg');
        if($('.row-offcanvas').hasClass('active')){
            $('#main').removeClass('col-sm-9 col-lg-10');
            $('#main').addClass('col-sm-12 col-lg-12');
        }else{
            $('#main').removeClass('col-sm-12 col-lg-12');
            $('#main').addClass('col-sm-9 col-lg-10');
        }
    });

    // allow collapsable side menu's
    $(document).on('click', '.mainMenuToggle', function(){
        if($(this).parent().hasClass('collapsed')){
            window.localStorage.setItem($(this).prev().text().trim(), 'opened');
            $(this).parent().removeClass('collapsed');
            $(this).parent().nextUntil('.mainMenu').slideDown('fast');
        }else{
            window.localStorage.setItem($(this).prev().text().trim(), 'closed');
            $(this).parent().addClass('collapsed');
            $(this).parent().nextUntil('.mainMenu').slideUp('fast');
        }
    });

    // To reset we call paginate() with no query object
    $(document).on('click', '#searchReset', function(){
        if(!$('#searchReset').hasClass('disabled')){
            localStorage.removeItem('searchQuery');
            window.location.href = $('#app_context').val() + '/app/' + $('#db_name').val() + '/' + $('#coll_name').val() + '/view/1';
        }
    });

    $(document).on('click', '#queryDocumentsAction', function(){
        var editor = ace.edit('json');
        var editor_val = editor.getValue();

        if(editor_val !== ''){
            // set the query in localStorage
            localStorage.setItem('searchQuery', editor_val);

            // go to page 1 to remove any issues being on page X from another query/view
            window.location.href = $('#app_context').val() + '/app/' + $('#db_name').val() + '/' + $('#coll_name').val() + '/view/1';

            // close the queryDocuments
            $('#queryDocuments').modal('hide');
        }else{
            show_notification('Please enter a query', 'danger');
        }
    });

    // when docs per page is changed
    $(document).on('change', '#docsPerPage', function(){
        localStorage.setItem('docsPerPage', $('#docsPerPage').val());
        window.location = $('#app_context').val() + '/app/' + $('#db_name').val() + '/' + $('#coll_name').val() + '/view/1';
    });

    // set the URL search parameters
    $(document).on('click', '#searchModalAction', function(){
        var key_name = $('#search_key_fields option:selected').text();
        var val = $('#search_value_value').val();

        if(key_name !== '' && val !== ''){
            // build the simply key/value query object and call paginate();
            var qry_obj = {};

            // check if value is a number/integer
            var intReg = new RegExp('^[0-9]+$');
            if(val.match(intReg)){
                val = parseInt(val);
            }else{
            // if we find an integer wrapped in quotes
                var strIntReg = new RegExp('^"[0-9]"+$');
                if(val.match(strIntReg)){
                    val = val.replace(/"/g, '');
                }
            }

            qry_obj[key_name] = val;

            // set the object to local storage to be used if page changes
            localStorage.setItem('searchQuery', JSON.stringify(qry_obj));

            // check if the key_name is "_id"
            if(key_name === '_id'){
                var query_string = window.toEJSON.serializeString('{"_id":ObjectId("' + val + '")}');
                localStorage.setItem('searchQuery', query_string);
            }

            // go to page 1 to remove any issues being on page X from another query/view
            window.location.href = $('#app_context').val() + '/app/' + $('#db_name').val() + '/' + $('#coll_name').val() + '/view/1';

            // close the searchModal
            $('#searchModal').modal('hide');
        }else{
            show_notification('Please enter a key (field) and a value to search for', 'danger');
        }
    });

    $('#collectioName').on('shown.bs.modal', function (e){
        var collection = $(e.relatedTarget).data('collection');
        $(this).find('.form-control').val(collection);
        $(this).data('collection', collection);
    });

    $(document).on('click', '#coll_name_edit', function(){
        var newCollName = $('#coll_name_newval').val();
        if(newCollName !== ''){
            var $collectioName = $('#collectioName');
            var oldCollection = $collectioName.data('collection');
            $.ajax({
                method: 'POST',
                url: $('#app_context').val() + '/collection/' + $('#db_name').val() + '/' + oldCollection + '/coll_name_edit',
                data: {'new_collection_name': newCollName}
            })
            .done(function(data){
                show_notification('Collection name is updated succesfully.', 'success', true);
            })
            .fail(function(data){
                show_notification(data.responseJSON.msg, 'danger');
            });
        }else{
            show_notification('Please enter an index', 'danger');
        }
    });

    $(document).on('click', '#coll_create', function(){
        if($('#new_coll_name').val() !== ''){
            $.ajax({
                method: 'POST',
                url: $('#app_context').val() + '/collection/' + $('#db_name').val() + '/coll_create',
                data: {'collection_name': $('#new_coll_name').val()}
            })
            .done(function(data){
                $('#del_coll_name').append('<option>' + $('#new_coll_name').val() + '</option>');
                $('#new_coll_name').val('');
                show_notification(data.msg, 'success');
            })
            .fail(function(data){
                show_notification(data.responseJSON.msg, 'danger');
            });
        }else{
            show_notification('Please enter a collection name', 'danger');
        }
    });

    $(document).on('click', '.delete-collection', function(){
        var $this = $(this);
        if(confirm('WARNING: Are you sure you want to delete this collection and all documents?') === true){
            var collection = $this.data('collection');
            $.ajax({
                method: 'POST',
                url: $('#app_context').val() + '/collection/' + $('#db_name').val() + '/coll_delete',
                data: {'collection_name': collection}
            })
            .done(function(data){
                $("#del_coll_name option:contains('" + data.coll_name + "')").remove();
                $('#del_coll_name').val($('#del_coll_name option:first').val());
                show_notification(data.msg, 'success');
            })
            .fail(function(data){
                show_notification(data.responseJSON.msg, 'danger');
            });
        }
    });

    $(document).on('click', '#db_create', function(){
        if($('#new_db_name').val() !== ''){
            $.ajax({
                method: 'POST',
                url: $('#app_context').val() + '/database/' + $('#db_name').val() + '/db_create',
                data: {'db_name': $('#new_db_name').val()}
            })
            .done(function(data){
                $('#del_db_name').append('<option>' + $('#new_db_name').val() + '</option>');
                $('#new_db_name').val('');
                show_notification(data.msg, 'success');
            })
            .fail(function(data){
                show_notification(data.responseJSON.msg, 'danger');
            });
        }else{
            show_notification('Please enter a database name', 'danger');
        }
    });

    $(document).on('click', '#db_delete', function(){
        if(confirm('WARNING: Are you sure you want to delete this database and all collections?') === true){
            $.ajax({
                method: 'POST',
                url: $('#app_context').val() + '/database/' + $('#db_name').val() + '/db_delete',
                data: {'db_name': $('#del_db_name option:selected').text()}
            })
            .done(function(data){
                $("#del_db_name option:contains('" + data.db_name + "')").remove();
                $('#del_db_name').val($('#del_db_name option:first').val());
                show_notification(data.msg, 'success', true);
            })
            .fail(function(data){
                show_notification(data.responseJSON.msg, 'danger');
            });
        }
    });

    $(document).on('click', '#user_create', function(){
        if($('#new_username').val() === ''){
            show_notification('Please enter a Username', 'danger');
            return;
        }
        if($('#new_password').val() === '' || $('#new_password_confirm').val() === ''){
            show_notification('Please enter a password and confirm', 'danger');
            return;
        }
        if($('#new_password').val() !== $('#new_password_confirm').val()){
            show_notification('Passwords do not match', 'danger');
            return;
        }

        $.ajax({
            method: 'POST',
            url: $('#app_context').val() + '/users/' + $('#db_name').val() + '/user_create',
            data: {
                'username': $('#new_username').val(),
                'user_password': $('#new_password').val(),
                'roles_text': $('#new_user_roles').val()
            }
        })
        .done(function(data){
            show_notification(data.msg, 'success', true);

        // clear items
            $('#new_username').val('');
            $('#new_password').val('');
            $('#new_password_confirm').val('');
            $('#new_user_roles').val('');
        })
        .fail(function(data){
            show_notification(data.responseJSON.msg, 'danger');
        });
    });

    $(document).on('click', '#btnqueryDocuments', function(){
        var editor = ace.edit('json');
        if(localStorage.getItem('searchQuery')){
            editor.setValue(localStorage.getItem('searchQuery'));
        }else{
            editor.setValue('{}');
        }
    });

    $(document).on('click', '.delete-user', function(){
        var $this = $(this);
        var user = $this.data('user');
        if(user && confirm('WARNING: Are you sure you want to delete this user?') === true){
            $.ajax({
                method: 'POST',
                url: $('#app_context').val() + '/users/' + $('#db_name').val() + '/user_delete',
                data: {'username': user}
            })
            .done(function(data){
                show_notification(data.msg, 'success', true);
            })
            .fail(function(data){
                show_notification(data.responseJSON.msg, 'danger');
            });
        }
    });

    $(document).on('click', '#add_config', function(){
        var db = ($('#new_conf_conn_db').val() || 'admin').trim();
        var hosts = [];
        $('.new_conf_conn_host_port').each(function(){
            var $this = $(this);
            var host = $this.find('.new_conf_conn_host').val() || '127.0.0.1';
            var port = $this.find('.new_conf_conn_port').val() || '27017';
            hosts.push(host + ':' + port);
        });
        var username = ($('#new_conf_conn_username').val() || '').trim();
        var password = ($('#new_conf_conn_password').val() || '').trim();
        if(db && hosts.length){
            var conn_string = 'mongodb://';
            if(username){
                conn_string += username + ':' + password + '@';
            }
            conn_string += hosts.join(',') + '/' + db;
            var editor = window.ace.edit('json');
            var options = editor.getValue();

            if(options === ''){
                options = {};
            }

            var data_obj = {};
            data_obj[0] = db;
            data_obj[1] = conn_string;
            data_obj[2] = options;

            $.ajax({
                method: 'POST',
                url: $('#app_context').val() + '/config/add_config',
                data: data_obj
            })
            .done(function(data){
                show_notification(data.msg, 'success');
                setInterval(function(){
                    location.reload();
                }, 2500);
            })
            .fail(function(data){
                show_notification(data.responseJSON.msg, 'danger');
            });
        }else{
            show_notification('Please enter both a connection name and connection string', 'danger');
        }
    });

    $(document).on('click', '.btnConnDelete', function(){
        if(confirm('WARNING: Are you sure you want to delete this connection?') === true){
            var current_name = $(this).parents('.conn_id').attr('id');
            var rowElement = $(this).parents('.connectionRow');

            $.ajax({
                method: 'POST',
                url: $('#app_context').val() + '/config/drop_config',
                data: {'curr_config': current_name}
            })
            .done(function(data){
                rowElement.remove();
                show_notification(data.msg, 'success');
            })
            .fail(function(data){
                show_notification(data.responseJSON.msg, 'danger');
            });
        }
    });

    // redirect to connection
    $(document).on('click', '.btnConnConnect', function(e){
        e.preventDefault();
        window.location.href = $('#app_context').val() + '/app/' + $(this).data('connection');
    });
});

function paginate(){
    $('#doc_load_placeholder').show();

    var page_num = $('#page_num').val();
    var page_len = $('#docs_per_page').val();
    var coll_name = $('#coll_name').val();
    var db_name = $('#db_name').val();
    var doc_id = $('#doc_id').val();

    // check local storage for pagination
    if(localStorage.getItem('docsPerPage')){
        page_len = localStorage.getItem('docsPerPage');
    }else{
        localStorage.setItem('docsPerPage', page_len);
    }

    // get the query (if any)
    if(doc_id){
        query_string = toEJSON.serializeString('{"_id":ObjectId("' + doc_id + '")}');
    }else{
        var query_string = localStorage.getItem('searchQuery');
        query_string = toEJSON.serializeString(query_string);
    }

    // add search to the API URL if it exists
    var api_url = $('#app_context').val() + '/api/' + db_name + '/' + coll_name + '/' + page_num;
    var pager_href = $('#app_context').val() + '/app/' + db_name + '/' + coll_name + '/view/{{number}}';

    $.ajax({
        type: 'POST',
        dataType: 'json',
        url: api_url,
        data: {'query': query_string, 'docsPerPage': page_len}
    })
    .done(function(response){
        // show message when none are found
        if(response.data === '' || response.total_docs === 0){
            $('#doc_none_found').show();
        }else{
            $('#doc_none_found').hide();
        }

        var total_docs = Math.ceil(response.total_docs / page_len);

        // remove the doc class when single doc is retured
        var docClass = 'doc_view';
        if(response.total_docs === 1){
            docClass = '';
        }

        if(total_docs > 1){
            $('#pager').show();
            $('#pager').bootpag({
                total: total_docs,
                page: page_num,
                maxVisible: 5,
                href: pager_href,
                firstLastUse: true,
                wrapClass: 'pagination justify-content-end'
            });
            $('#pager li').addClass('page-item');
            $('#pager li > a').addClass('page-link');
        }else{
            $('#pager').hide();
        }

        var isFiltered = '';

        // enable/disable the reset filter button
        if(query_string == null){
            $('#searchReset').addClass('disabled');
        }else{
            $('#searchReset').removeClass('disabled');
            isFiltered = " <span class='text-danger'>(filtered)</span>";
        }

        // set the total record count
        $('#recordCount').html(response.total_docs + isFiltered);

        // if filtered, change button text
        if(query_string !== null){
            $('#btnMassDelete').html('Delete selected');
        }

        // disable/enable the mass delete button if records are returned
        if(total_docs === 0){
            $('#btnMassDelete').prop('disabled', true);
        }else{
            $('#btnMassDelete').prop('disabled', false);
        }

        // clear the div first
        var $coll_docs = $('#coll_docs');
        $coll_docs.empty();
        var $listGroup = $('<div class="list-group list-group-flush"></div>').appendTo($coll_docs);
        var escaper = $('<div></div>');
        for(var i = 0; i < response.data.length; i++){
            var doc = response.data[i];
            var _id = doc['_id'];
            escaper[0].textContent = JSON.stringify(doc, null, 4);
            var $listGroupItem = $('<div class="list-group-item code-block"></div>').addClass(docClass).appendTo($listGroup);
            var $listGroupItemLink = $('<a class="clickable code-block_expand d-flex align-items-center"></a>').appendTo($listGroupItem);
            $('<i class="icon-add material-icons md-18 ml-2 mr-3">add</i>').appendTo($listGroupItemLink);
            $('<i class="icon-remove material-icons md-18 ml-2 mr-3">remove</i>').appendTo($listGroupItemLink);
            $listGroupItemLink.append(_id);
            var $pre = $('<pre class="mt-2">').appendTo($listGroupItem);
            var $code = $('<code class="json">').html(escaper[0].innerHTML).appendTo($pre);
            var $nav = $('<nav class="nav justify-content-end">').appendTo($listGroupItem);
            $('<a class="nav-link" href="#">').attr('onclick', 'deleteDoc(\'' + _id + '\')').text(response.deleteButton).appendTo($nav);
            $('<a class="nav-link">').attr('href', $('#app_context').val() + '/app/' + db_name + '/' + coll_name + '/' + _id).text(response.linkButton).appendTo($nav);
            $('<a class="nav-link">').attr('href', $('#app_context').val() + '/app/' + db_name + '/' + coll_name + '/edit/' + _id).text(response.editButton).appendTo($nav);
            if(window.hljs){
                console.log('do highlight');
                window.hljs.highlightBlock($code[0]);
            }
        };
        // Bind the DropDown Select For Fields
        var option = '';
        for(var x = 0; x < response.fields.length; x++){
            option += '<option value="' + response.fields[x] + '">' + response.fields[x] + '</option>';
        }
        $('#search_key_fields').append(option);

        // hide the loading placeholder
        $('#doc_load_placeholder').hide();

        // hook up the syntax highlight and prettify the json
        hljs.configure({languages: ['json']});
        $('.code-block').each(function (i, block){
            hljs.highlightBlock(block);
            $(block).find('.code-block_expand').click(function (event){
                $(block).toggleClass('expanded');
            });
        });

        // Show extended message if API returns an invalid query
        if(response.validQuery === false){
            show_notification('Invalid query syntax' + response.queryMessage, 'danger', false, 3000);
        }
    })
    .fail(function(){
        show_notification('Error getting data from Query API', 'danger');
    });
}

function deleteDoc(doc_id){
    if(confirm('WARNING: Are you sure you want to delete this document?') === true){
        $.ajax({
            method: 'POST',
            url: $('#app_context').val() + '/document/' + $('#db_name').val() + '/' + $('#coll_name').val() + '/doc_delete',
            data: {'doc_id': doc_id}
        })
        .done(function(data){
            show_notification(data.msg, 'success');
            paginate();
        })
        .fail(function(data){
            show_notification(data.responseJSON.msg, 'danger');
        });
    }
}

$(document).on('click', '#btnMassDelete', function(){
    var doc_id = $('#doc_id').val();
    var coll_name = $('#coll_name').val();
    var db_name = $('#db_name').val();
    var query_string;

    // get the query (if any)
    if(doc_id){
        query_string = window.toEJSON.serializeString('{"_id":ObjectId("' + doc_id + '")}');
    }else{
        var local_query_string = localStorage.getItem('searchQuery');
        query_string = window.toEJSON.serializeString(local_query_string);
    }

    // set the default confirm text
    var confirmText = 'WARNING: Are you sure you want to delete all documents in this collection?';

    // if a query is specified, show the "selection" alternative text
    if(query_string){
        confirmText = 'WARNING: Are you sure you want to delete the selection of documents?';
    }

    if(confirm(confirmText) === true){
        $.ajax({
            method: 'POST',
            url: $('#app_context').val() + '/document/' + db_name + '/' + coll_name + '/mass_delete',
            data: {'query': query_string}
        })
        .done(function(data){
            localStorage.removeItem('searchQuery');
            show_notification(data.msg, 'success', true);
        })
        .fail(function(data){
            show_notification(data.responseJSON.msg, 'danger');
        });
    }
});

$(document).on('click', '#coll_addindex', function(){
    var edit = ace.edit('json');
    var json = $.parseJSON(edit.getValue());

    if(json !== '{}'){
        var data_obj = {};
        data_obj[0] = JSON.stringify(json);
        data_obj[1] = $('#index_unique').is(':checked') ? 'true' : 'false';
        data_obj[2] = $('#index_sparse').is(':checked') ? 'true' : 'false';

        $.ajax({
            method: 'POST',
            url: $('#app_context').val() + '/collection/' + $('#db_name').val() + '/' + $('#coll_name').val() + '/create_index',
            data: data_obj
        })
        .done(function(data){
            show_notification(data.msg, 'success', true);
        })
        .fail(function(data){
            show_notification(data.responseJSON.msg, 'danger');
        });
    }else{
        show_notification('Please enter an index', 'danger');
    }
});

function dropIndex(index_index){
    $.ajax({
        method: 'POST',
        url: $('#app_context').val() + '/collection/' + $('#db_name').val() + '/' + $('#coll_name').val() + '/drop_index',
        data: {'index': index_index}
    })
    .done(function(data){
        $('#index_row_' + index_index).remove();
        show_notification(data.msg, 'success');
    })
    .fail(function(data){
        show_notification(data.responseJSON.msg, 'danger');
    });
}

// show notification popup
function show_notification(msg, type, reload_page, timeout){
    // defaults to false
    reload_page = reload_page || false;
    timeout = timeout || 3000;
    var $alert = $('<div class="alert -slideInRight" role="alert"></div>');
    $alert.addClass('alert-' + type);
    $alert.text(msg);
    $alert.appendTo($('#notify_messages'));
    setTimeout(function(){
        $alert.remove();
        if(reload_page === true){
            location.reload();
        }
    }, 3000);
}
