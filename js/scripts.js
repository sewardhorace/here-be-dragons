
var FileManager = {

    fileInputNode : document.getElementById('file-input'),
    fileSaveNode : document.getElementById('file-save'),
    data : null,
    fileName : "map.json",

    loadData : function(data) {
        this.data = data;
        console.log(this.fileName);
    },

    readFile : function(e) {
        var file = e.target.files[0];
        if (!file) {
            return;
        }
        var reader = new FileReader();
        var self = this;
        reader.onload = function(e) {
            var data = JSON.parse(e.target.result);
            self.loadData(data);
        };
        reader.readAsText(file);
        this.fileName = file.name;
    },

    saveFile : function(e) {
        var blob = new Blob([JSON.stringify(this.data)], {type: "application/json;charset=utf-8"});
        saveAs(blob, this.getFileName());
    },

    getFileName : function() {
        var name;
        if (this.fileName.lastIndexOf(".json") >= 0) {
            name = this.fileName.trim();
        } else {
            name = this.fileName.trim() + ".json";
        }
        return name;
    },

    //TODO: don't bind nodes to this object, just call its functions
    init : function () {
        this.fileInputNode.addEventListener('change', this.readFile.bind(this), false);
        this.fileSaveNode.addEventListener('click', this.saveFile.bind(this), false);
    },
    
};

FileManager.init();