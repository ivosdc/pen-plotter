
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? undefined : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.20.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/Wifi.svelte generated by Svelte v3.20.1 */
    const file = "src/Wifi.svelte";

    function create_fragment(ctx) {
    	let main;
    	let table;
    	let tr;
    	let td0;
    	let label0;
    	let t1;
    	let input0;
    	let t2;
    	let td1;
    	let label1;
    	let t4;
    	let input1;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			table = element("table");
    			tr = element("tr");
    			td0 = element("td");
    			label0 = element("label");
    			label0.textContent = "SSID:";
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			td1 = element("td");
    			label1 = element("label");
    			label1.textContent = "Password:";
    			t4 = space();
    			input1 = element("input");
    			attr_dev(label0, "for", "ssid");
    			attr_dev(label0, "class", "svelte-465dlj");
    			add_location(label0, file, 19, 4, 373);
    			attr_dev(input0, "id", "ssid");
    			attr_dev(input0, "placeholder", "enter ssid");
    			attr_dev(input0, "class", "svelte-465dlj");
    			add_location(input0, file, 20, 8, 413);
    			add_location(td0, file, 18, 15, 364);
    			attr_dev(label1, "for", "password");
    			attr_dev(label1, "class", "svelte-465dlj");
    			add_location(label1, file, 22, 4, 516);
    			attr_dev(input1, "id", "password");
    			attr_dev(input1, "placeholder", "enter password");
    			attr_dev(input1, "class", "svelte-465dlj");
    			add_location(input1, file, 23, 8, 564);
    			add_location(td1, file, 21, 9, 507);
    			add_location(tr, file, 18, 11, 360);
    			add_location(table, file, 18, 4, 353);
    			attr_dev(main, "class", "svelte-465dlj");
    			add_location(main, file, 17, 0, 342);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, main, anchor);
    			append_dev(main, table);
    			append_dev(table, tr);
    			append_dev(tr, td0);
    			append_dev(td0, label0);
    			append_dev(td0, t1);
    			append_dev(td0, input0);
    			set_input_value(input0, /*wifi*/ ctx[0].ssid);
    			append_dev(td0, t2);
    			append_dev(tr, td1);
    			append_dev(td1, label1);
    			append_dev(td1, t4);
    			append_dev(td1, input1);
    			set_input_value(input1, /*wifi*/ ctx[0].password);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(input0, "input", /*input0_input_handler*/ ctx[3]),
    				listen_dev(input0, "input", /*setWifi*/ ctx[1], false, false, false),
    				listen_dev(input1, "input", /*input1_input_handler*/ ctx[4]),
    				listen_dev(input1, "input", /*setWifi*/ ctx[1], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*wifi*/ 1 && input0.value !== /*wifi*/ ctx[0].ssid) {
    				set_input_value(input0, /*wifi*/ ctx[0].ssid);
    			}

    			if (dirty & /*wifi*/ 1 && input1.value !== /*wifi*/ ctx[0].password) {
    				set_input_value(input1, /*wifi*/ ctx[0].password);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();

    	function setWifi() {
    		dispatch("setwifi", { ssid: wifi.ssid, password: wifi.password });
    	}

    	const wifi = { ssid: "ssid", password: "password" };
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Wifi> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Wifi", $$slots, []);

    	function input0_input_handler() {
    		wifi.ssid = this.value;
    		$$invalidate(0, wifi);
    	}

    	function input1_input_handler() {
    		wifi.password = this.value;
    		$$invalidate(0, wifi);
    	}

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		setWifi,
    		wifi
    	});

    	return [wifi, setWifi, dispatch, input0_input_handler, input1_input_handler];
    }

    class Wifi extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { wifi: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Wifi",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get wifi() {
    		return this.$$.ctx[0];
    	}

    	set wifi(value) {
    		throw new Error("<Wifi>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/HostIp.svelte generated by Svelte v3.20.1 */
    const file$1 = "src/HostIp.svelte";

    function create_fragment$1(ctx) {
    	let main;
    	let label;
    	let t1;
    	let input;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			label = element("label");
    			label.textContent = "Host IP :";
    			t1 = space();
    			input = element("input");
    			attr_dev(label, "for", "hostname");
    			attr_dev(label, "class", "svelte-465dlj");
    			add_location(label, file$1, 14, 4, 252);
    			attr_dev(input, "id", "hostname");
    			attr_dev(input, "placeholder", "enter host");
    			attr_dev(input, "class", "svelte-465dlj");
    			add_location(input, file$1, 15, 4, 296);
    			attr_dev(main, "class", "svelte-465dlj");
    			add_location(main, file$1, 13, 0, 241);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, main, anchor);
    			append_dev(main, label);
    			append_dev(main, t1);
    			append_dev(main, input);
    			set_input_value(input, /*hostip*/ ctx[0]);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(input, "input", /*input_input_handler*/ ctx[3]),
    				listen_dev(input, "input", /*setHost*/ ctx[1], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*hostip*/ 1 && input.value !== /*hostip*/ ctx[0]) {
    				set_input_value(input, /*hostip*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let { hostip } = $$props;

    	function setHost() {
    		dispatch("sethost", { host: hostip });
    	}

    	const writable_props = ["hostip"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<HostIp> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("HostIp", $$slots, []);

    	function input_input_handler() {
    		hostip = this.value;
    		$$invalidate(0, hostip);
    	}

    	$$self.$set = $$props => {
    		if ("hostip" in $$props) $$invalidate(0, hostip = $$props.hostip);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		hostip,
    		setHost
    	});

    	$$self.$inject_state = $$props => {
    		if ("hostip" in $$props) $$invalidate(0, hostip = $$props.hostip);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [hostip, setHost, dispatch, input_input_handler];
    }

    class HostIp extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { hostip: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "HostIp",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*hostip*/ ctx[0] === undefined && !("hostip" in props)) {
    			console.warn("<HostIp> was created without expected prop 'hostip'");
    		}
    	}

    	get hostip() {
    		throw new Error("<HostIp>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set hostip(value) {
    		throw new Error("<HostIp>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Plotter.svelte generated by Svelte v3.20.1 */
    const file$2 = "src/Plotter.svelte";

    function create_fragment$2(ctx) {
    	let main;
    	let label;
    	let t1;
    	let input0;
    	let t2;
    	let input1;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			label = element("label");
    			label.textContent = "Zoomfactor:";
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			input1 = element("input");
    			attr_dev(label, "for", "zoomfactor");
    			attr_dev(label, "class", "svelte-1pw1onq");
    			add_location(label, file$2, 25, 8, 494);
    			attr_dev(input0, "id", "zoomfacter");
    			attr_dev(input0, "type", "range");
    			attr_dev(input0, "min", "0");
    			attr_dev(input0, "max", maxDigits);
    			attr_dev(input0, "class", "svelte-1pw1onq");
    			add_location(input0, file$2, 26, 12, 550);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "min", "0");
    			attr_dev(input1, "max", maxSteps);
    			attr_dev(input1, "size", "2");
    			input1.disabled = true;
    			attr_dev(input1, "class", "svelte-1pw1onq");
    			add_location(input1, file$2, 27, 12, 674);
    			attr_dev(main, "class", "svelte-1pw1onq");
    			add_location(main, file$2, 24, 0, 479);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, main, anchor);
    			append_dev(main, label);
    			append_dev(main, t1);
    			append_dev(main, input0);
    			set_input_value(input0, /*plotter*/ ctx[0].zoomFactor);
    			append_dev(main, t2);
    			append_dev(main, input1);
    			set_input_value(input1, /*zoomDigits*/ ctx[1]);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(input0, "change", /*input0_change_input_handler*/ ctx[4]),
    				listen_dev(input0, "input", /*input0_change_input_handler*/ ctx[4]),
    				listen_dev(input0, "input", /*setPlotter*/ ctx[2], false, false, false),
    				listen_dev(input1, "input", /*input1_input_handler*/ ctx[5])
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*plotter*/ 1) {
    				set_input_value(input0, /*plotter*/ ctx[0].zoomFactor);
    			}

    			if (dirty & /*zoomDigits*/ 2 && input1.value !== /*zoomDigits*/ ctx[1]) {
    				set_input_value(input1, /*zoomDigits*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const maxDigits = 50;
    const maxSteps = 5;

    function instance$2($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	const plotter = { zoomFactor: 10 };
    	let zoomDigits = plotter.zoomFactor / (maxDigits / maxSteps);

    	function setPlotter() {
    		$$invalidate(1, zoomDigits = plotter.zoomFactor / (maxDigits / maxSteps));
    		dispatch("setplotter", { zoomFactor: zoomDigits });
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Plotter> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Plotter", $$slots, []);

    	function input0_change_input_handler() {
    		plotter.zoomFactor = to_number(this.value);
    		$$invalidate(0, plotter);
    	}

    	function input1_input_handler() {
    		zoomDigits = this.value;
    		$$invalidate(1, zoomDigits);
    	}

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		maxDigits,
    		maxSteps,
    		plotter,
    		zoomDigits,
    		setPlotter
    	});

    	$$self.$inject_state = $$props => {
    		if ("zoomDigits" in $$props) $$invalidate(1, zoomDigits = $$props.zoomDigits);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		plotter,
    		zoomDigits,
    		setPlotter,
    		dispatch,
    		input0_change_input_handler,
    		input1_input_handler
    	];
    }

    class Plotter extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { plotter: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Plotter",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get plotter() {
    		return this.$$.ctx[0];
    	}

    	set plotter(value) {
    		throw new Error("<Plotter>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Upload.svelte generated by Svelte v3.20.1 */
    const file$3 = "src/Upload.svelte";
    const get_default_slot_changes = dirty => ({ dragging: dirty & /*dragging*/ 8 });
    const get_default_slot_context = ctx => ({ dragging: /*dragging*/ ctx[3] });

    // (73:21)          
    function fallback_block(ctx) {
    	let div;
    	let t0;
    	let strong;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("Drag & Drop your file(s) or\n            ");
    			strong = element("strong");
    			strong.textContent = "browse.";
    			add_location(strong, file$3, 75, 12, 1954);
    			attr_dev(div, "class", "dragarea svelte-4ye3sq");
    			add_location(div, file$3, 73, 8, 1875);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, strong);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block.name,
    		type: "fallback",
    		source: "(73:21)          ",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let main;
    	let label;
    	let t;
    	let input;
    	let current;
    	let dispose;
    	const default_slot_template = /*$$slots*/ ctx[9].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], get_default_slot_context);
    	const default_slot_or_fallback = default_slot || fallback_block(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			label = element("label");
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			t = space();
    			input = element("input");
    			attr_dev(input, "type", "file");
    			input.multiple = /*multiple*/ ctx[0];
    			attr_dev(input, "class", "svelte-4ye3sq");
    			add_location(input, file$3, 78, 4, 2010);
    			attr_dev(label, "class", "svelte-4ye3sq");
    			toggle_class(label, "dragging", /*dragging*/ ctx[3]);
    			add_location(label, file$3, 67, 0, 1649);
    			add_location(main, file$3, 66, 0, 1642);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, main, anchor);
    			append_dev(main, label);

    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(label, null);
    			}

    			append_dev(label, t);
    			append_dev(label, input);
    			current = true;
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(input, "input", /*onFile*/ ctx[6](getFilesFromInputEvent), false, false, false),
    				listen_dev(label, "drop", prevent_default(/*onFile*/ ctx[6](getFilesFromDropEvent)), false, true, false),
    				listen_dev(label, "dragover", prevent_default(/*startDragging*/ ctx[4]), false, true, false),
    				listen_dev(label, "dragleave", prevent_default(/*stopDragging*/ ctx[5]), false, true, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope, dragging*/ 264) {
    					default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[8], get_default_slot_context), get_slot_changes(default_slot_template, /*$$scope*/ ctx[8], dirty, get_default_slot_changes));
    				}
    			}

    			if (!current || dirty & /*multiple*/ 1) {
    				prop_dev(input, "multiple", /*multiple*/ ctx[0]);
    			}

    			if (dirty & /*dragging*/ 8) {
    				toggle_class(label, "dragging", /*dragging*/ ctx[3]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function getFilesFromDropEvent({ dataTransfer: { files, items } }) {
    	return files.length
    	? [...files]
    	: items.filter(({ kind }) => kind === "file").map(({ getAsFile }) => getAsFile());
    }

    function getFilesFromInputEvent({ target }) {
    	const files = target.files ? [...target.files] : [];
    	target.value = "";
    	return files;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { multiple = true } = $$props;
    	let dragging = false;
    	const dispatch = createEventDispatcher();

    	function startDragging() {
    		$$invalidate(3, dragging = true);
    	}

    	function stopDragging() {
    		$$invalidate(3, dragging = false);
    	}

    	const onFile = getFilesFunction => event => {
    		stopDragging();
    		const files = getFilesFunction(event);

    		if (files.length) {
    			dispatch("setfilename", { files: multiple ? files : files[0] });
    		}
    	};

    	const writable_props = ["multiple"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Upload> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Upload", $$slots, ['default']);

    	$$self.$set = $$props => {
    		if ("multiple" in $$props) $$invalidate(0, multiple = $$props.multiple);
    		if ("$$scope" in $$props) $$invalidate(8, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		multiple,
    		dragging,
    		dispatch,
    		getFilesFromDropEvent,
    		getFilesFromInputEvent,
    		startDragging,
    		stopDragging,
    		onFile
    	});

    	$$self.$inject_state = $$props => {
    		if ("multiple" in $$props) $$invalidate(0, multiple = $$props.multiple);
    		if ("dragging" in $$props) $$invalidate(3, dragging = $$props.dragging);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		multiple,
    		getFilesFromDropEvent,
    		getFilesFromInputEvent,
    		dragging,
    		startDragging,
    		stopDragging,
    		onFile,
    		dispatch,
    		$$scope,
    		$$slots
    	];
    }

    class Upload extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			multiple: 0,
    			getFilesFromDropEvent: 1,
    			getFilesFromInputEvent: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Upload",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get multiple() {
    		throw new Error("<Upload>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set multiple(value) {
    		throw new Error("<Upload>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getFilesFromDropEvent() {
    		return getFilesFromDropEvent;
    	}

    	set getFilesFromDropEvent(value) {
    		throw new Error("<Upload>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getFilesFromInputEvent() {
    		return getFilesFromInputEvent;
    	}

    	set getFilesFromInputEvent(value) {
    		throw new Error("<Upload>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.20.1 */
    const file$4 = "src/App.svelte";

    function create_fragment$4(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let hr0;
    	let t2;
    	let label0;
    	let t4;
    	let ul0;
    	let ul0_class_value;
    	let t5;
    	let hr1;
    	let t6;
    	let label1;
    	let t8;
    	let ul1;
    	let t9;
    	let button0;
    	let ul1_class_value;
    	let t11;
    	let hr2;
    	let t12;
    	let label2;
    	let t14;
    	let ul2;
    	let t15;
    	let button1;
    	let ul2_class_value;
    	let t17;
    	let hr3;
    	let t18;
    	let label3;
    	let t20;
    	let ul3;
    	let t21;
    	let t22_value = /*files*/ ctx[5].length + "";
    	let t22;
    	let t23;
    	let t24;
    	let button2;
    	let ul3_class_value;
    	let t26;
    	let hr4;
    	let t27;
    	let label4;
    	let t29;
    	let ul4;
    	let button3;
    	let t31;
    	let button4;
    	let t33;
    	let button5;
    	let t35;
    	let button6;
    	let t37;
    	let link0;
    	let t38;
    	let link1;
    	let current;
    	let dispose;

    	const hostip_1 = new HostIp({
    			props: { hostip: /*hostip*/ ctx[4] },
    			$$inline: true
    		});

    	hostip_1.$on("sethost", /*handleSetHostInput*/ ctx[6]);
    	const wifi_1 = new Wifi({ $$inline: true });
    	wifi_1.$on("setwifi", /*handleSetWifiInput*/ ctx[7]);
    	const plotter_1 = new Plotter({ $$inline: true });
    	plotter_1.$on("setplotter", /*handleSetPlotterInput*/ ctx[8]);
    	const upload_1 = new Upload({ $$inline: true });
    	upload_1.$on("setfilename", /*handleUploadInput*/ ctx[9]);

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Plotter-UI";
    			t1 = space();
    			hr0 = element("hr");
    			t2 = space();
    			label0 = element("label");
    			label0.textContent = "Host settings:";
    			t4 = space();
    			ul0 = element("ul");
    			create_component(hostip_1.$$.fragment);
    			t5 = space();
    			hr1 = element("hr");
    			t6 = space();
    			label1 = element("label");
    			label1.textContent = "WiFi settings:";
    			t8 = space();
    			ul1 = element("ul");
    			create_component(wifi_1.$$.fragment);
    			t9 = space();
    			button0 = element("button");
    			button0.textContent = "set Wifi";
    			t11 = space();
    			hr2 = element("hr");
    			t12 = space();
    			label2 = element("label");
    			label2.textContent = "Plotter settings:";
    			t14 = space();
    			ul2 = element("ul");
    			create_component(plotter_1.$$.fragment);
    			t15 = space();
    			button1 = element("button");
    			button1.textContent = "set Config";
    			t17 = space();
    			hr3 = element("hr");
    			t18 = space();
    			label3 = element("label");
    			label3.textContent = "Upload file:";
    			t20 = space();
    			ul3 = element("ul");
    			t21 = text("Selected: ");
    			t22 = text(t22_value);
    			t23 = space();
    			create_component(upload_1.$$.fragment);
    			t24 = space();
    			button2 = element("button");
    			button2.textContent = "upload";
    			t26 = space();
    			hr4 = element("hr");
    			t27 = space();
    			label4 = element("label");
    			label4.textContent = "Plotter Control:";
    			t29 = space();
    			ul4 = element("ul");
    			button3 = element("button");
    			button3.textContent = "get Config";
    			t31 = space();
    			button4 = element("button");
    			button4.textContent = "show plot data";
    			t33 = space();
    			button5 = element("button");
    			button5.textContent = "Start";
    			t35 = space();
    			button6 = element("button");
    			button6.textContent = "Stop";
    			t37 = space();
    			link0 = element("link");
    			t38 = space();
    			link1 = element("link");
    			attr_dev(h1, "class", "svelte-1cnl9ms");
    			add_location(h1, file$4, 198, 1, 4450);
    			add_location(hr0, file$4, 199, 1, 4471);
    			attr_dev(label0, "class", "clickable svelte-1cnl9ms");
    			attr_dev(label0, "for", "hostsettings");
    			add_location(label0, file$4, 200, 1, 4477);
    			attr_dev(ul0, "id", "hostsettings");
    			attr_dev(ul0, "class", ul0_class_value = "" + (null_to_empty(/*toggleHostSettings*/ ctx[2] ? "unfolded" : "folded") + " svelte-1cnl9ms"));
    			add_location(ul0, file$4, 201, 1, 4573);
    			add_location(hr1, file$4, 204, 1, 4726);
    			attr_dev(label1, "class", "clickable svelte-1cnl9ms");
    			attr_dev(label1, "for", "wifisettings");
    			add_location(label1, file$4, 205, 1, 4732);
    			attr_dev(button0, "class", "btn btn-4 btn-sep icon-send svelte-1cnl9ms");
    			add_location(button0, file$4, 208, 2, 4954);
    			attr_dev(ul1, "id", "wifisettings");
    			attr_dev(ul1, "class", ul1_class_value = "" + (null_to_empty(/*toggleWifiSettings*/ ctx[0] ? "unfolded" : "folded") + " svelte-1cnl9ms"));
    			add_location(ul1, file$4, 206, 1, 4828);
    			add_location(hr2, file$4, 210, 1, 5049);
    			attr_dev(label2, "class", "clickable svelte-1cnl9ms");
    			attr_dev(label2, "for", "plottersettings");
    			add_location(label2, file$4, 211, 1, 5055);
    			attr_dev(button1, "class", "btn btn-4 btn-sep icon-send svelte-1cnl9ms");
    			add_location(button1, file$4, 214, 2, 5302);
    			attr_dev(ul2, "id", "plottersettings");
    			attr_dev(ul2, "class", ul2_class_value = "" + (null_to_empty(/*toggleConfigSettings*/ ctx[1] ? "unfolded" : "folded") + " svelte-1cnl9ms"));
    			add_location(ul2, file$4, 212, 1, 5159);
    			add_location(hr3, file$4, 216, 1, 5401);
    			attr_dev(label3, "class", "clickable svelte-1cnl9ms");
    			attr_dev(label3, "for", "uploadsettings");
    			add_location(label3, file$4, 217, 1, 5407);
    			attr_dev(button2, "class", "btn btn-4 btn-sep icon-send svelte-1cnl9ms");
    			add_location(button2, file$4, 221, 2, 5669);
    			attr_dev(ul3, "id", "uploadsettings");
    			attr_dev(ul3, "class", ul3_class_value = "" + (null_to_empty(/*toggleUploadSettings*/ ctx[3] ? "unfolded" : "folded") + " svelte-1cnl9ms"));
    			add_location(ul3, file$4, 218, 1, 5505);
    			add_location(hr4, file$4, 223, 1, 5761);
    			attr_dev(label4, "for", "uploadsettings");
    			attr_dev(label4, "class", "svelte-1cnl9ms");
    			add_location(label4, file$4, 224, 1, 5767);
    			attr_dev(button3, "class", "btn btn-1 btn-sep icon-info svelte-1cnl9ms");
    			add_location(button3, file$4, 226, 1, 5847);
    			attr_dev(button4, "class", "btn btn-1 btn-sep icon-info svelte-1cnl9ms");
    			add_location(button4, file$4, 227, 1, 5939);
    			attr_dev(button5, "class", "btn btn-2 btn-sep icon-send svelte-1cnl9ms");
    			add_location(button5, file$4, 228, 1, 6033);
    			attr_dev(button6, "class", "btn btn-3 btn-sep icon-heart svelte-1cnl9ms");
    			add_location(button6, file$4, 229, 1, 6123);
    			attr_dev(ul4, "id", "uploadsettings");
    			attr_dev(ul4, "class", "svelte-1cnl9ms");
    			add_location(ul4, file$4, 225, 1, 5821);
    			attr_dev(main, "class", "svelte-1cnl9ms");
    			add_location(main, file$4, 197, 0, 4442);
    			attr_dev(link0, "href", "//maxcdn.bootstrapcdn.com/font-awesome/4.1.0/css/font-awesome.min.css");
    			attr_dev(link0, "rel", "stylesheet");
    			add_location(link0, file$4, 233, 0, 6227);
    			attr_dev(link1, "href", "https://fonts.googleapis.com/css?family=Lato");
    			attr_dev(link1, "rel", "stylesheet");
    			attr_dev(link1, "type", "text/css");
    			add_location(link1, file$4, 234, 0, 6328);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, hr0);
    			append_dev(main, t2);
    			append_dev(main, label0);
    			append_dev(main, t4);
    			append_dev(main, ul0);
    			mount_component(hostip_1, ul0, null);
    			append_dev(main, t5);
    			append_dev(main, hr1);
    			append_dev(main, t6);
    			append_dev(main, label1);
    			append_dev(main, t8);
    			append_dev(main, ul1);
    			mount_component(wifi_1, ul1, null);
    			append_dev(ul1, t9);
    			append_dev(ul1, button0);
    			append_dev(main, t11);
    			append_dev(main, hr2);
    			append_dev(main, t12);
    			append_dev(main, label2);
    			append_dev(main, t14);
    			append_dev(main, ul2);
    			mount_component(plotter_1, ul2, null);
    			append_dev(ul2, t15);
    			append_dev(ul2, button1);
    			append_dev(main, t17);
    			append_dev(main, hr3);
    			append_dev(main, t18);
    			append_dev(main, label3);
    			append_dev(main, t20);
    			append_dev(main, ul3);
    			append_dev(ul3, t21);
    			append_dev(ul3, t22);
    			append_dev(ul3, t23);
    			mount_component(upload_1, ul3, null);
    			append_dev(ul3, t24);
    			append_dev(ul3, button2);
    			append_dev(main, t26);
    			append_dev(main, hr4);
    			append_dev(main, t27);
    			append_dev(main, label4);
    			append_dev(main, t29);
    			append_dev(main, ul4);
    			append_dev(ul4, button3);
    			append_dev(ul4, t31);
    			append_dev(ul4, button4);
    			append_dev(ul4, t33);
    			append_dev(ul4, button5);
    			append_dev(ul4, t35);
    			append_dev(ul4, button6);
    			insert_dev(target, t37, anchor);
    			insert_dev(target, link0, anchor);
    			insert_dev(target, t38, anchor);
    			insert_dev(target, link1, anchor);
    			current = true;
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(label0, "click", /*handleToggleHost*/ ctx[16], false, false, false),
    				listen_dev(label1, "click", /*handleToggleWifi*/ ctx[14], false, false, false),
    				listen_dev(button0, "click", /*handleSetWifi*/ ctx[10], false, false, false),
    				listen_dev(label2, "click", /*handleToggleConfig*/ ctx[15], false, false, false),
    				listen_dev(button1, "click", /*handleSetConfig*/ ctx[11], false, false, false),
    				listen_dev(label3, "click", /*handleToggleUpload*/ ctx[17], false, false, false),
    				listen_dev(button2, "click", /*handleUpload*/ ctx[18], false, false, false),
    				listen_dev(button3, "click", /*handleGetConfig*/ ctx[12], false, false, false),
    				listen_dev(button4, "click", /*handleGetPlot*/ ctx[13], false, false, false),
    				listen_dev(button5, "click", /*handlePlotterStart*/ ctx[19], false, false, false),
    				listen_dev(button6, "click", /*handlePlotterStop*/ ctx[20], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			const hostip_1_changes = {};
    			if (dirty & /*hostip*/ 16) hostip_1_changes.hostip = /*hostip*/ ctx[4];
    			hostip_1.$set(hostip_1_changes);

    			if (!current || dirty & /*toggleHostSettings*/ 4 && ul0_class_value !== (ul0_class_value = "" + (null_to_empty(/*toggleHostSettings*/ ctx[2] ? "unfolded" : "folded") + " svelte-1cnl9ms"))) {
    				attr_dev(ul0, "class", ul0_class_value);
    			}

    			if (!current || dirty & /*toggleWifiSettings*/ 1 && ul1_class_value !== (ul1_class_value = "" + (null_to_empty(/*toggleWifiSettings*/ ctx[0] ? "unfolded" : "folded") + " svelte-1cnl9ms"))) {
    				attr_dev(ul1, "class", ul1_class_value);
    			}

    			if (!current || dirty & /*toggleConfigSettings*/ 2 && ul2_class_value !== (ul2_class_value = "" + (null_to_empty(/*toggleConfigSettings*/ ctx[1] ? "unfolded" : "folded") + " svelte-1cnl9ms"))) {
    				attr_dev(ul2, "class", ul2_class_value);
    			}

    			if ((!current || dirty & /*files*/ 32) && t22_value !== (t22_value = /*files*/ ctx[5].length + "")) set_data_dev(t22, t22_value);

    			if (!current || dirty & /*toggleUploadSettings*/ 8 && ul3_class_value !== (ul3_class_value = "" + (null_to_empty(/*toggleUploadSettings*/ ctx[3] ? "unfolded" : "folded") + " svelte-1cnl9ms"))) {
    				attr_dev(ul3, "class", ul3_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(hostip_1.$$.fragment, local);
    			transition_in(wifi_1.$$.fragment, local);
    			transition_in(plotter_1.$$.fragment, local);
    			transition_in(upload_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(hostip_1.$$.fragment, local);
    			transition_out(wifi_1.$$.fragment, local);
    			transition_out(plotter_1.$$.fragment, local);
    			transition_out(upload_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(hostip_1);
    			destroy_component(wifi_1);
    			destroy_component(plotter_1);
    			destroy_component(upload_1);
    			if (detaching) detach_dev(t37);
    			if (detaching) detach_dev(link0);
    			if (detaching) detach_dev(t38);
    			if (detaching) detach_dev(link1);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { toggleWifiSettings = false } = $$props;
    	let { toggleConfigSettings = false } = $$props;
    	let { toggleHostSettings = false } = $$props;
    	let { toggleUploadSettings = false } = $$props;
    	let { hostip } = $$props;
    	let { files = [] } = $$props;
    	const wifi = { ssid: "ssid", password: "password" };
    	const plotter = { zoomFactor: 0 };

    	function handleSetHostInput(e) {
    		$$invalidate(4, hostip = e.detail.host);
    	}

    	function handleSetWifiInput(e) {
    		$$invalidate(21, wifi.ssid = e.detail.ssid, wifi);
    		$$invalidate(21, wifi.password = e.detail.password, wifi);
    	}

    	function handleSetPlotterInput(e) {
    		$$invalidate(22, plotter.zoomFactor = e.detail.zoomFactor, plotter);
    	}

    	function handleUploadInput(e) {
    		$$invalidate(5, files = Array.from(e.detail.files));
    	}

    	async function setWifi() {
    		const options = {
    			method: "POST",
    			headers: new Headers({
    					"content-type": "application/json",
    					"Access-Control-Allow-Origin": "*"
    				}),
    			body: JSON.stringify(wifi)
    		};

    		const response = await fetch("http://" + hostip + "/wifi", options);
    		const string = await response.text();
    		const json = string === "" ? {} : JSON.parse(string);
    		return json;
    	}

    	function handleSetWifi(e) {
    		setWifi().then(response => {
    			alert(JSON.stringify(response));
    		}).catch(error => {
    			alert(error.message);
    		});
    	}

    	async function setConfig() {
    		const options = {
    			method: "POST",
    			headers: new Headers({
    					"content-type": "application/json",
    					"Access-Control-Allow-Origin": "*"
    				}),
    			body: JSON.stringify(plotter)
    		};

    		const response = await fetch("http://" + hostip + "/config", options);
    		const string = await response.text();
    		const json = string === "" ? {} : JSON.parse(string);
    		return json;
    	}

    	function handleSetConfig(e) {
    		setConfig().then(response => {
    			alert(JSON.stringify(response));
    		}).catch(error => {
    			alert(error.message);
    		});
    	}

    	async function getConfig() {
    		const options = {
    			method: "GET",
    			headers: new Headers({
    					"content-type": "application/json",
    					"Access-Control-Allow-Origin": "*"
    				})
    		};

    		const response = await fetch("http://" + hostip + "/config", options);
    		const string = await response.text();
    		const json = string === "" ? {} : JSON.parse(string);
    		return json;
    	}

    	function handleGetConfig(e) {
    		getConfig().then(response => {
    			alert(JSON.stringify(response));
    		}).catch(error => {
    			alert(error.message);
    		});
    	}

    	async function getPlot() {
    		const options = {
    			method: "GET",
    			headers: new Headers({
    					"content-type": "text/plain",
    					"Access-Control-Allow-Origin": "*"
    				})
    		};

    		const response = await fetch("http://" + hostip + "/plot", options);
    		const string = await response.text();
    		return string;
    	}

    	function handleGetPlot(e) {
    		getPlot().then(response => {
    			alert(response);
    		}).catch(error => {
    			alert(error.message);
    		});
    	}

    	function handleToggleWifi(e) {
    		$$invalidate(0, toggleWifiSettings = !toggleWifiSettings);
    	}

    	function handleToggleConfig(e) {
    		$$invalidate(1, toggleConfigSettings = !toggleConfigSettings);
    	}

    	function handleToggleHost(e) {
    		$$invalidate(2, toggleHostSettings = !toggleHostSettings);
    	}

    	function handleToggleUpload(e) {
    		$$invalidate(3, toggleUploadSettings = !toggleUploadSettings);
    	}

    	async function upload() {
    		let data = new FormData();
    		data.append("/wall-plotter.data", files[0]);

    		const options = {
    			method: "POST",
    			headers: new Headers({ "Access-Control-Allow-Origin": "*" }),
    			body: data
    		};

    		const response = await fetch("http://" + hostip + "/plot", options);
    		const string = await response.text();
    		return string;
    	}

    	function handleUpload(e) {
    		upload().then(response => {
    			alert(JSON.stringify(response));
    		}).catch(error => {
    			alert(error.message);
    		});
    	}

    	async function plotterControl(command) {
    		const options = {
    			method: "POST",
    			headers: new Headers({ "Access-Control-Allow-Origin": "*" })
    		};

    		const response = await fetch("http://" + hostip + "/" + command, options);
    		const string = await response.text();
    		return string;
    	}

    	function handlePlotterStart(e) {
    		plotterControl("start").then(response => {
    			alert(JSON.stringify(response));
    		}).catch(error => {
    			alert(error.message);
    		});
    	}

    	function handlePlotterStop(e) {
    		plotterControl("stop").then(response => {
    			alert(JSON.stringify(response));
    		}).catch(error => {
    			alert(error.message);
    		});
    	}

    	const writable_props = [
    		"toggleWifiSettings",
    		"toggleConfigSettings",
    		"toggleHostSettings",
    		"toggleUploadSettings",
    		"hostip",
    		"files"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	$$self.$set = $$props => {
    		if ("toggleWifiSettings" in $$props) $$invalidate(0, toggleWifiSettings = $$props.toggleWifiSettings);
    		if ("toggleConfigSettings" in $$props) $$invalidate(1, toggleConfigSettings = $$props.toggleConfigSettings);
    		if ("toggleHostSettings" in $$props) $$invalidate(2, toggleHostSettings = $$props.toggleHostSettings);
    		if ("toggleUploadSettings" in $$props) $$invalidate(3, toggleUploadSettings = $$props.toggleUploadSettings);
    		if ("hostip" in $$props) $$invalidate(4, hostip = $$props.hostip);
    		if ("files" in $$props) $$invalidate(5, files = $$props.files);
    	};

    	$$self.$capture_state = () => ({
    		Wifi,
    		HostIp,
    		Plotter,
    		Upload,
    		toggleWifiSettings,
    		toggleConfigSettings,
    		toggleHostSettings,
    		toggleUploadSettings,
    		hostip,
    		files,
    		wifi,
    		plotter,
    		handleSetHostInput,
    		handleSetWifiInput,
    		handleSetPlotterInput,
    		handleUploadInput,
    		setWifi,
    		handleSetWifi,
    		setConfig,
    		handleSetConfig,
    		getConfig,
    		handleGetConfig,
    		getPlot,
    		handleGetPlot,
    		handleToggleWifi,
    		handleToggleConfig,
    		handleToggleHost,
    		handleToggleUpload,
    		upload,
    		handleUpload,
    		plotterControl,
    		handlePlotterStart,
    		handlePlotterStop
    	});

    	$$self.$inject_state = $$props => {
    		if ("toggleWifiSettings" in $$props) $$invalidate(0, toggleWifiSettings = $$props.toggleWifiSettings);
    		if ("toggleConfigSettings" in $$props) $$invalidate(1, toggleConfigSettings = $$props.toggleConfigSettings);
    		if ("toggleHostSettings" in $$props) $$invalidate(2, toggleHostSettings = $$props.toggleHostSettings);
    		if ("toggleUploadSettings" in $$props) $$invalidate(3, toggleUploadSettings = $$props.toggleUploadSettings);
    		if ("hostip" in $$props) $$invalidate(4, hostip = $$props.hostip);
    		if ("files" in $$props) $$invalidate(5, files = $$props.files);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		toggleWifiSettings,
    		toggleConfigSettings,
    		toggleHostSettings,
    		toggleUploadSettings,
    		hostip,
    		files,
    		handleSetHostInput,
    		handleSetWifiInput,
    		handleSetPlotterInput,
    		handleUploadInput,
    		handleSetWifi,
    		handleSetConfig,
    		handleGetConfig,
    		handleGetPlot,
    		handleToggleWifi,
    		handleToggleConfig,
    		handleToggleHost,
    		handleToggleUpload,
    		handleUpload,
    		handlePlotterStart,
    		handlePlotterStop,
    		wifi,
    		plotter
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
    			toggleWifiSettings: 0,
    			toggleConfigSettings: 1,
    			toggleHostSettings: 2,
    			toggleUploadSettings: 3,
    			hostip: 4,
    			files: 5,
    			wifi: 21,
    			plotter: 22
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*hostip*/ ctx[4] === undefined && !("hostip" in props)) {
    			console.warn("<App> was created without expected prop 'hostip'");
    		}
    	}

    	get toggleWifiSettings() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set toggleWifiSettings(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get toggleConfigSettings() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set toggleConfigSettings(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get toggleHostSettings() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set toggleHostSettings(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get toggleUploadSettings() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set toggleUploadSettings(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get hostip() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set hostip(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get files() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set files(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get wifi() {
    		return this.$$.ctx[21];
    	}

    	set wifi(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get plotter() {
    		return this.$$.ctx[22];
    	}

    	set plotter(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		hostip: '192.168.1.146'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
