let tabSystem = {
    // put configurations in here
    initSettings: function () {
        this.tabParentId = "tabs";
        this.tabClass = "tab";
        this.tabActiveClass = "tab--active";
        this.tabTargetAttribute = "data-tab-target";
        
        this.tabContentClass = "tab__content";
        this.tabContentActiveClass = "tab__content--active";
    },

    init: function () {
        // initialize variables
        this.initSettings();

        this.tabParent = document.getElementById(this.tabParentId);

        // get tabs
        this.tabs = []
        for (let i = 0; i < this.tabParent.childNodes.length; i++) {
            let c = this.tabParent.childNodes[i];
            if (c.nodeType == Node.ELEMENT_NODE && c.className.includes(this.tabClass)) {
                this.tabs.push(c);

                // add listener
                c.onclick = () => { this.activateTab(c) };
                
                // assign tab content class to tab-target
                this.modifyTabTargetClass(c, this.tabContentClass, "add");
            }
        }

        // activate first tab
        this.activateTab(this.tabs[0]);
    },

    activateTab(tab) {
        // activate next tab
        if (tab) {
            tab.className += tab.className[tab.className.length - 1] == ' ' ? this.tabActiveClass : ' ' + this.tabActiveClass;
            this.modifyTabTargetClass(tab, this.tabContentActiveClass, "add");
        }

        // remove active from previous tab
        if (this.previousTab) {
            this.previousTab.className = this.previousTab.className.replace(this.tabActiveClass, '');
            this.modifyTabTargetClass(this.previousTab, this.tabContentActiveClass, "remove");
        }

        this.previousTab = tab;
    },

    getTabTarget(tab) {
        return document.getElementById(tab.getAttribute(this.tabTargetAttribute));
    },

    modifyTabTargetClass(tab, className, action) {
        let element = this.getTabTarget(tab);
        if (element) {

            switch (action) {
                case "add":
                    element.classList.add(className);
                    break;
                
                case "remove":
                default:
                    element.classList.remove(className);
                    break;
            }
        }
    }
}

tabSystem.init();