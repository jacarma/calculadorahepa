
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
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
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
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
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
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
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
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
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
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
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
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
            set_current_component(null);
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
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
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

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
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
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
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
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.29.7' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
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
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/FilterLabel.svelte generated by Svelte v3.29.7 */

    const file = "src/FilterLabel.svelte";

    function create_fragment(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(/*filter*/ ctx[0]);
    			attr_dev(span, "class", /*classes*/ ctx[1]);
    			add_location(span, file, 8, 0, 220);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*filter*/ 1) set_data_dev(t, /*filter*/ ctx[0]);

    			if (dirty & /*classes*/ 2) {
    				attr_dev(span, "class", /*classes*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
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
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("FilterLabel", slots, []);
    	let { filter } = $$props;
    	let classes;
    	const writable_props = ["filter"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<FilterLabel> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("filter" in $$props) $$invalidate(0, filter = $$props.filter);
    	};

    	$$self.$capture_state = () => ({ filter, classes });

    	$$self.$inject_state = $$props => {
    		if ("filter" in $$props) $$invalidate(0, filter = $$props.filter);
    		if ("classes" in $$props) $$invalidate(1, classes = $$props.classes);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*filter*/ 1) {
    			 $$invalidate(1, classes = ["HEPA H13", "HEPA H14", "MERV 13", "MERV 13"].includes(filter)
    			? "text-green-600 font-bold text-base"
    			: "text-red-600 font-bold text-base");
    		}
    	};

    	return [filter, classes];
    }

    class FilterLabel extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { filter: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FilterLabel",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*filter*/ ctx[0] === undefined && !("filter" in props)) {
    			console.warn("<FilterLabel> was created without expected prop 'filter'");
    		}
    	}

    	get filter() {
    		throw new Error("<FilterLabel>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set filter(value) {
    		throw new Error("<FilterLabel>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/RuidoLabel.svelte generated by Svelte v3.29.7 */

    const file$1 = "src/RuidoLabel.svelte";

    function create_fragment$1(ctx) {
    	let span;
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t0 = text(/*ruido*/ ctx[0]);
    			t1 = text(" db");
    			attr_dev(span, "class", /*classes*/ ctx[1]);
    			add_location(span, file$1, 9, 0, 175);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			append_dev(span, t1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*ruido*/ 1) set_data_dev(t0, /*ruido*/ ctx[0]);

    			if (dirty & /*classes*/ 2) {
    				attr_dev(span, "class", /*classes*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
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
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("RuidoLabel", slots, []);
    	let { ruido } = $$props;
    	let classes;
    	const writable_props = ["ruido"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<RuidoLabel> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("ruido" in $$props) $$invalidate(0, ruido = $$props.ruido);
    	};

    	$$self.$capture_state = () => ({ ruido, classes });

    	$$self.$inject_state = $$props => {
    		if ("ruido" in $$props) $$invalidate(0, ruido = $$props.ruido);
    		if ("classes" in $$props) $$invalidate(1, classes = $$props.classes);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*ruido*/ 1) {
    			 $$invalidate(1, classes = ruido <= 55
    			? "text-green-600 font-bold text-base"
    			: "text-red-600 font-bold text-base");
    		}
    	};

    	return [ruido, classes];
    }

    class RuidoLabel extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { ruido: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "RuidoLabel",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*ruido*/ ctx[0] === undefined && !("ruido" in props)) {
    			console.warn("<RuidoLabel> was created without expected prop 'ruido'");
    		}
    	}

    	get ruido() {
    		throw new Error("<RuidoLabel>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ruido(value) {
    		throw new Error("<RuidoLabel>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/CADRLabel.svelte generated by Svelte v3.29.7 */

    const file$2 = "src/CADRLabel.svelte";

    function create_fragment$2(ctx) {
    	let span;
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t0 = text(/*CADR*/ ctx[0]);
    			t1 = text(" m³/h");
    			attr_dev(span, "class", /*classes*/ ctx[1]);
    			add_location(span, file$2, 12, 0, 288);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			append_dev(span, t1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*CADR*/ 1) set_data_dev(t0, /*CADR*/ ctx[0]);

    			if (dirty & /*classes*/ 2) {
    				attr_dev(span, "class", /*classes*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
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

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("CADRLabel", slots, []);
    	let { CADR } = $$props;
    	let { needCADR } = $$props;
    	let classes;
    	const writable_props = ["CADR", "needCADR"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<CADRLabel> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("CADR" in $$props) $$invalidate(0, CADR = $$props.CADR);
    		if ("needCADR" in $$props) $$invalidate(2, needCADR = $$props.needCADR);
    	};

    	$$self.$capture_state = () => ({ CADR, needCADR, classes });

    	$$self.$inject_state = $$props => {
    		if ("CADR" in $$props) $$invalidate(0, CADR = $$props.CADR);
    		if ("needCADR" in $$props) $$invalidate(2, needCADR = $$props.needCADR);
    		if ("classes" in $$props) $$invalidate(1, classes = $$props.classes);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*CADR, needCADR*/ 5) {
    			 $$invalidate(1, classes = CADR > needCADR
    			? "text-green-600 font-bold text-base"
    			: Math.ceil(needCADR / CADR) === 2
    				? "text-orange-600 font-bold text-base"
    				: "text-red-600 font-bold text-base");
    		}
    	};

    	return [CADR, classes, needCADR];
    }

    class CADRLabel extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { CADR: 0, needCADR: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CADRLabel",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*CADR*/ ctx[0] === undefined && !("CADR" in props)) {
    			console.warn("<CADRLabel> was created without expected prop 'CADR'");
    		}

    		if (/*needCADR*/ ctx[2] === undefined && !("needCADR" in props)) {
    			console.warn("<CADRLabel> was created without expected prop 'needCADR'");
    		}
    	}

    	get CADR() {
    		throw new Error("<CADRLabel>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set CADR(value) {
    		throw new Error("<CADRLabel>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get needCADR() {
    		throw new Error("<CADRLabel>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set needCADR(value) {
    		throw new Error("<CADRLabel>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/NumDevicesLabel.svelte generated by Svelte v3.29.7 */

    const file$3 = "src/NumDevicesLabel.svelte";

    function create_fragment$3(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(/*numDevices*/ ctx[0]);
    			attr_dev(span, "class", /*classes*/ ctx[1]);
    			add_location(span, file$3, 11, 0, 254);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*numDevices*/ 1) set_data_dev(t, /*numDevices*/ ctx[0]);

    			if (dirty & /*classes*/ 2) {
    				attr_dev(span, "class", /*classes*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
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

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("NumDevicesLabel", slots, []);
    	let { numDevices } = $$props;
    	let classes;
    	const writable_props = ["numDevices"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<NumDevicesLabel> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("numDevices" in $$props) $$invalidate(0, numDevices = $$props.numDevices);
    	};

    	$$self.$capture_state = () => ({ numDevices, classes });

    	$$self.$inject_state = $$props => {
    		if ("numDevices" in $$props) $$invalidate(0, numDevices = $$props.numDevices);
    		if ("classes" in $$props) $$invalidate(1, classes = $$props.classes);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*numDevices*/ 1) {
    			 $$invalidate(1, classes = numDevices == 1
    			? "text-green-600 font-bold text-base"
    			: numDevices == 2
    				? "text-orange-600 font-bold text-base"
    				: "text-red-600 font-bold text-base");
    		}
    	};

    	return [numDevices, classes];
    }

    class NumDevicesLabel extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { numDevices: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NumDevicesLabel",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*numDevices*/ ctx[0] === undefined && !("numDevices" in props)) {
    			console.warn("<NumDevicesLabel> was created without expected prop 'numDevices'");
    		}
    	}

    	get numDevices() {
    		throw new Error("<NumDevicesLabel>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set numDevices(value) {
    		throw new Error("<NumDevicesLabel>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Product.svelte generated by Svelte v3.29.7 */
    const file$4 = "src/Product.svelte";

    function create_fragment$4(ctx) {
    	let div2;
    	let div0;
    	let iframe;
    	let iframe_title_value;
    	let iframe_src_value;
    	let t0;
    	let div1;
    	let h1;
    	let t1_value = /*product*/ ctx[0].name + "";
    	let t1;
    	let t2;
    	let p0;
    	let t3;
    	let filter;
    	let t4;
    	let p1;
    	let t5;
    	let ruido;
    	let t6;
    	let p2;
    	let t7;
    	let cadr;
    	let t8;
    	let p3;
    	let t9;
    	let numdevices;
    	let current;

    	filter = new FilterLabel({
    			props: { filter: /*product*/ ctx[0].filter },
    			$$inline: true
    		});

    	ruido = new RuidoLabel({
    			props: { ruido: /*product*/ ctx[0].db },
    			$$inline: true
    		});

    	cadr = new CADRLabel({
    			props: {
    				CADR: /*product*/ ctx[0].CADR,
    				needCADR: /*needCADR*/ ctx[1]
    			},
    			$$inline: true
    		});

    	numdevices = new NumDevicesLabel({
    			props: { numDevices: /*numDevices*/ ctx[2] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			iframe = element("iframe");
    			t0 = space();
    			div1 = element("div");
    			h1 = element("h1");
    			t1 = text(t1_value);
    			t2 = space();
    			p0 = element("p");
    			t3 = text("Filtro\n      ");
    			create_component(filter.$$.fragment);
    			t4 = space();
    			p1 = element("p");
    			t5 = text("Ruido\n      ");
    			create_component(ruido.$$.fragment);
    			t6 = space();
    			p2 = element("p");
    			t7 = text("CADR\n      ");
    			create_component(cadr.$$.fragment);
    			t8 = space();
    			p3 = element("p");
    			t9 = text("Dispositivos necesarios\n      ");
    			create_component(numdevices.$$.fragment);
    			set_style(iframe, "width", "120px");
    			set_style(iframe, "height", "240px");
    			attr_dev(iframe, "marginwidth", "0");
    			attr_dev(iframe, "marginheight", "0");
    			attr_dev(iframe, "scrolling", "no");
    			attr_dev(iframe, "frameborder", "0");
    			attr_dev(iframe, "title", iframe_title_value = /*product*/ ctx[0].name);
    			if (iframe.src !== (iframe_src_value = "https://rcm-eu.amazon-adsystem.com/e/cm?ref=tf_til&t=hepa07-21&m=amazon&o=30&p=8&l=as1&IS1=1&asins=" + /*product*/ ctx[0].ASIN + "&bc1=ffffff&lt1=_blank&fc1=333333&lc1=0066c0&bg1=ffffff&f=ifr")) attr_dev(iframe, "src", iframe_src_value);
    			add_location(iframe, file$4, 12, 4, 404);
    			attr_dev(div0, "class", "pt-4 pl-4");
    			add_location(div0, file$4, 11, 2, 376);
    			attr_dev(h1, "class", "text-gray-900 font-bold text-lg mb-4");
    			add_location(h1, file$4, 22, 4, 797);
    			attr_dev(p0, "class", "my-3 text-gray-600 text-sm");
    			add_location(p0, file$4, 23, 4, 870);
    			attr_dev(p1, "class", "my-3 text-gray-600 text-sm");
    			add_location(p1, file$4, 27, 4, 976);
    			attr_dev(p2, "class", "my-3 text-gray-600 text-sm");
    			add_location(p2, file$4, 31, 4, 1075);
    			attr_dev(p3, "class", "my-3 text-gray-600 text-sm");
    			add_location(p3, file$4, 35, 4, 1184);
    			attr_dev(div1, "class", "flex-1 p-4");
    			add_location(div1, file$4, 21, 2, 768);
    			attr_dev(div2, "class", "flex bg-white shadow rounded-lg overflow-hidden");
    			add_location(div2, file$4, 10, 0, 312);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, iframe);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div1, h1);
    			append_dev(h1, t1);
    			append_dev(div1, t2);
    			append_dev(div1, p0);
    			append_dev(p0, t3);
    			mount_component(filter, p0, null);
    			append_dev(div1, t4);
    			append_dev(div1, p1);
    			append_dev(p1, t5);
    			mount_component(ruido, p1, null);
    			append_dev(div1, t6);
    			append_dev(div1, p2);
    			append_dev(p2, t7);
    			mount_component(cadr, p2, null);
    			append_dev(div1, t8);
    			append_dev(div1, p3);
    			append_dev(p3, t9);
    			mount_component(numdevices, p3, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*product*/ 1 && iframe_title_value !== (iframe_title_value = /*product*/ ctx[0].name)) {
    				attr_dev(iframe, "title", iframe_title_value);
    			}

    			if (!current || dirty & /*product*/ 1 && iframe.src !== (iframe_src_value = "https://rcm-eu.amazon-adsystem.com/e/cm?ref=tf_til&t=hepa07-21&m=amazon&o=30&p=8&l=as1&IS1=1&asins=" + /*product*/ ctx[0].ASIN + "&bc1=ffffff&lt1=_blank&fc1=333333&lc1=0066c0&bg1=ffffff&f=ifr")) {
    				attr_dev(iframe, "src", iframe_src_value);
    			}

    			if ((!current || dirty & /*product*/ 1) && t1_value !== (t1_value = /*product*/ ctx[0].name + "")) set_data_dev(t1, t1_value);
    			const filter_changes = {};
    			if (dirty & /*product*/ 1) filter_changes.filter = /*product*/ ctx[0].filter;
    			filter.$set(filter_changes);
    			const ruido_changes = {};
    			if (dirty & /*product*/ 1) ruido_changes.ruido = /*product*/ ctx[0].db;
    			ruido.$set(ruido_changes);
    			const cadr_changes = {};
    			if (dirty & /*product*/ 1) cadr_changes.CADR = /*product*/ ctx[0].CADR;
    			if (dirty & /*needCADR*/ 2) cadr_changes.needCADR = /*needCADR*/ ctx[1];
    			cadr.$set(cadr_changes);
    			const numdevices_changes = {};
    			if (dirty & /*numDevices*/ 4) numdevices_changes.numDevices = /*numDevices*/ ctx[2];
    			numdevices.$set(numdevices_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(filter.$$.fragment, local);
    			transition_in(ruido.$$.fragment, local);
    			transition_in(cadr.$$.fragment, local);
    			transition_in(numdevices.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(filter.$$.fragment, local);
    			transition_out(ruido.$$.fragment, local);
    			transition_out(cadr.$$.fragment, local);
    			transition_out(numdevices.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_component(filter);
    			destroy_component(ruido);
    			destroy_component(cadr);
    			destroy_component(numdevices);
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
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Product", slots, []);
    	let { product = {} } = $$props;
    	let { needCADR = 450 } = $$props;
    	const writable_props = ["product", "needCADR"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Product> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("product" in $$props) $$invalidate(0, product = $$props.product);
    		if ("needCADR" in $$props) $$invalidate(1, needCADR = $$props.needCADR);
    	};

    	$$self.$capture_state = () => ({
    		Filter: FilterLabel,
    		Ruido: RuidoLabel,
    		CADR: CADRLabel,
    		NumDevices: NumDevicesLabel,
    		product,
    		needCADR,
    		numDevices
    	});

    	$$self.$inject_state = $$props => {
    		if ("product" in $$props) $$invalidate(0, product = $$props.product);
    		if ("needCADR" in $$props) $$invalidate(1, needCADR = $$props.needCADR);
    		if ("numDevices" in $$props) $$invalidate(2, numDevices = $$props.numDevices);
    	};

    	let numDevices;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*needCADR, product*/ 3) {
    			 $$invalidate(2, numDevices = Math.ceil(needCADR / product.CADR));
    		}
    	};

    	return [product, needCADR, numDevices];
    }

    class Product extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { product: 0, needCADR: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Product",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get product() {
    		throw new Error("<Product>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set product(value) {
    		throw new Error("<Product>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get needCADR() {
    		throw new Error("<Product>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set needCADR(value) {
    		throw new Error("<Product>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/ProductTable.svelte generated by Svelte v3.29.7 */
    const file$5 = "src/ProductTable.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    // (30:6) {#each products as product}
    function create_each_block(ctx) {
    	let div;
    	let product;
    	let t;
    	let current;

    	product = new Product({
    			props: {
    				product: /*product*/ ctx[6],
    				needCADR: /*needCADR*/ ctx[0]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(product.$$.fragment);
    			t = space();
    			attr_dev(div, "class", "px-1 w-full md:my-4 md:px-4 md:w-1/2 xl:my-4 xl:px-4 xl:w-1/3");
    			add_location(div, file$5, 30, 8, 955);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(product, div, null);
    			append_dev(div, t);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const product_changes = {};
    			if (dirty & /*products*/ 2) product_changes.product = /*product*/ ctx[6];
    			if (dirty & /*needCADR*/ 1) product_changes.needCADR = /*needCADR*/ ctx[0];
    			product.$set(product_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(product.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(product.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(product);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(30:6) {#each products as product}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div3;
    	let div2;
    	let h1;
    	let t1;
    	let div0;
    	let label0;
    	let t2;
    	let input0;
    	let t3;
    	let label1;
    	let t4;
    	let input1;
    	let t5;
    	let div1;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*products*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Purificadores de aire";
    			t1 = space();
    			div0 = element("div");
    			label0 = element("label");
    			t2 = text("Ocultar CADR bajo\n        ");
    			input0 = element("input");
    			t3 = space();
    			label1 = element("label");
    			t4 = text("Mostrar no HEPA estándar\n        ");
    			input1 = element("input");
    			t5 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(h1, "class", "text-3xl lg:text-4xl");
    			add_location(h1, file$5, 11, 4, 280);
    			attr_dev(input0, "type", "checkbox");
    			attr_dev(input0, "class", "form-checkbox w-5 h-5 ml-2");
    			add_location(input0, file$5, 15, 8, 477);
    			attr_dev(label0, "class", "text-gray-700 cursor-pointer m-4 whitespace-no-wrap");
    			add_location(label0, file$5, 13, 6, 375);
    			attr_dev(input1, "type", "checkbox");
    			attr_dev(input1, "class", "form-checkbox w-5 h-5 ml-2");
    			add_location(input1, file$5, 22, 8, 722);
    			attr_dev(label1, "class", "text-gray-700 cursor-pointer m-4 whitespace-no-wrap");
    			add_location(label1, file$5, 20, 6, 613);
    			attr_dev(div0, "class", "-mx-4 mt-4");
    			add_location(div0, file$5, 12, 4, 344);
    			attr_dev(div1, "class", "flex flex-wrap -mx-1 md:-mx-4");
    			add_location(div1, file$5, 28, 4, 869);
    			attr_dev(div2, "class", "lg:mx-auto lg:container p-2 xl:p-8");
    			attr_dev(div2, "id", "filtros");
    			add_location(div2, file$5, 10, 2, 214);
    			attr_dev(div3, "class", "bg-white my-4 ");
    			attr_dev(div3, "id", "filtros");
    			add_location(div3, file$5, 9, 0, 170);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, h1);
    			append_dev(div2, t1);
    			append_dev(div2, div0);
    			append_dev(div0, label0);
    			append_dev(label0, t2);
    			append_dev(label0, input0);
    			input0.checked = /*hideCADR*/ ctx[2];
    			append_dev(div0, t3);
    			append_dev(div0, label1);
    			append_dev(label1, t4);
    			append_dev(label1, input1);
    			input1.checked = /*showNoHEPA*/ ctx[3];
    			append_dev(div2, t5);
    			append_dev(div2, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "change", /*input0_change_handler*/ ctx[4]),
    					listen_dev(input1, "change", /*input1_change_handler*/ ctx[5])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*hideCADR*/ 4) {
    				input0.checked = /*hideCADR*/ ctx[2];
    			}

    			if (dirty & /*showNoHEPA*/ 8) {
    				input1.checked = /*showNoHEPA*/ ctx[3];
    			}

    			if (dirty & /*products, needCADR*/ 3) {
    				each_value = /*products*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div1, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ProductTable", slots, []);
    	let { needCADR } = $$props;
    	let { products = [1, 2, 3] } = $$props;
    	let hideCADR = false;
    	let showNoHEPA = true;
    	const writable_props = ["needCADR", "products"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ProductTable> was created with unknown prop '${key}'`);
    	});

    	function input0_change_handler() {
    		hideCADR = this.checked;
    		$$invalidate(2, hideCADR);
    	}

    	function input1_change_handler() {
    		showNoHEPA = this.checked;
    		$$invalidate(3, showNoHEPA);
    	}

    	$$self.$$set = $$props => {
    		if ("needCADR" in $$props) $$invalidate(0, needCADR = $$props.needCADR);
    		if ("products" in $$props) $$invalidate(1, products = $$props.products);
    	};

    	$$self.$capture_state = () => ({
    		Product,
    		needCADR,
    		products,
    		hideCADR,
    		showNoHEPA
    	});

    	$$self.$inject_state = $$props => {
    		if ("needCADR" in $$props) $$invalidate(0, needCADR = $$props.needCADR);
    		if ("products" in $$props) $$invalidate(1, products = $$props.products);
    		if ("hideCADR" in $$props) $$invalidate(2, hideCADR = $$props.hideCADR);
    		if ("showNoHEPA" in $$props) $$invalidate(3, showNoHEPA = $$props.showNoHEPA);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		needCADR,
    		products,
    		hideCADR,
    		showNoHEPA,
    		input0_change_handler,
    		input1_change_handler
    	];
    }

    class ProductTable extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { needCADR: 0, products: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ProductTable",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*needCADR*/ ctx[0] === undefined && !("needCADR" in props)) {
    			console.warn("<ProductTable> was created without expected prop 'needCADR'");
    		}
    	}

    	get needCADR() {
    		throw new Error("<ProductTable>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set needCADR(value) {
    		throw new Error("<ProductTable>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get products() {
    		throw new Error("<ProductTable>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set products(value) {
    		throw new Error("<ProductTable>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    function is_date(obj) {
        return Object.prototype.toString.call(obj) === '[object Date]';
    }

    function tick_spring(ctx, last_value, current_value, target_value) {
        if (typeof current_value === 'number' || is_date(current_value)) {
            // @ts-ignore
            const delta = target_value - current_value;
            // @ts-ignore
            const velocity = (current_value - last_value) / (ctx.dt || 1 / 60); // guard div by 0
            const spring = ctx.opts.stiffness * delta;
            const damper = ctx.opts.damping * velocity;
            const acceleration = (spring - damper) * ctx.inv_mass;
            const d = (velocity + acceleration) * ctx.dt;
            if (Math.abs(d) < ctx.opts.precision && Math.abs(delta) < ctx.opts.precision) {
                return target_value; // settled
            }
            else {
                ctx.settled = false; // signal loop to keep ticking
                // @ts-ignore
                return is_date(current_value) ?
                    new Date(current_value.getTime() + d) : current_value + d;
            }
        }
        else if (Array.isArray(current_value)) {
            // @ts-ignore
            return current_value.map((_, i) => tick_spring(ctx, last_value[i], current_value[i], target_value[i]));
        }
        else if (typeof current_value === 'object') {
            const next_value = {};
            for (const k in current_value) {
                // @ts-ignore
                next_value[k] = tick_spring(ctx, last_value[k], current_value[k], target_value[k]);
            }
            // @ts-ignore
            return next_value;
        }
        else {
            throw new Error(`Cannot spring ${typeof current_value} values`);
        }
    }
    function spring(value, opts = {}) {
        const store = writable(value);
        const { stiffness = 0.15, damping = 0.8, precision = 0.01 } = opts;
        let last_time;
        let task;
        let current_token;
        let last_value = value;
        let target_value = value;
        let inv_mass = 1;
        let inv_mass_recovery_rate = 0;
        let cancel_task = false;
        function set(new_value, opts = {}) {
            target_value = new_value;
            const token = current_token = {};
            if (value == null || opts.hard || (spring.stiffness >= 1 && spring.damping >= 1)) {
                cancel_task = true; // cancel any running animation
                last_time = now();
                last_value = new_value;
                store.set(value = target_value);
                return Promise.resolve();
            }
            else if (opts.soft) {
                const rate = opts.soft === true ? .5 : +opts.soft;
                inv_mass_recovery_rate = 1 / (rate * 60);
                inv_mass = 0; // infinite mass, unaffected by spring forces
            }
            if (!task) {
                last_time = now();
                cancel_task = false;
                task = loop(now => {
                    if (cancel_task) {
                        cancel_task = false;
                        task = null;
                        return false;
                    }
                    inv_mass = Math.min(inv_mass + inv_mass_recovery_rate, 1);
                    const ctx = {
                        inv_mass,
                        opts: spring,
                        settled: true,
                        dt: (now - last_time) * 60 / 1000
                    };
                    const next_value = tick_spring(ctx, last_value, value, target_value);
                    last_time = now;
                    last_value = value;
                    store.set(value = next_value);
                    if (ctx.settled) {
                        task = null;
                    }
                    return !ctx.settled;
                });
            }
            return new Promise(fulfil => {
                task.promise.then(() => {
                    if (token === current_token)
                        fulfil();
                });
            });
        }
        const spring = {
            set,
            update: (fn, opts) => set(fn(target_value, value), opts),
            subscribe: store.subscribe,
            stiffness,
            damping,
            precision
        };
        return spring;
    }

    /* node_modules/svelte-range-slider-pips/src/RangePips.svelte generated by Svelte v3.29.7 */

    const file$6 = "node_modules/svelte-range-slider-pips/src/RangePips.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[21] = list[i];
    	child_ctx[23] = i;
    	return child_ctx;
    }

    // (137:2) {#if ( all && first !== false ) || first }
    function create_if_block_5(ctx) {
    	let span;
    	let span_style_value;
    	let if_block = (/*all*/ ctx[3] === "label" || /*first*/ ctx[4] === "label") && create_if_block_6(ctx);

    	const block = {
    		c: function create() {
    			span = element("span");
    			if (if_block) if_block.c();
    			attr_dev(span, "class", "pip first");
    			attr_dev(span, "style", span_style_value = "" + ((/*vertical*/ ctx[2] ? "top" : "left") + ": 0%;"));
    			toggle_class(span, "selected", /*isSelected*/ ctx[14](/*min*/ ctx[0]));
    			toggle_class(span, "in-range", /*inRange*/ ctx[15](/*min*/ ctx[0]));
    			add_location(span, file$6, 137, 4, 3365);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			if (if_block) if_block.m(span, null);
    		},
    		p: function update(ctx, dirty) {
    			if (/*all*/ ctx[3] === "label" || /*first*/ ctx[4] === "label") {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_6(ctx);
    					if_block.c();
    					if_block.m(span, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*vertical*/ 4 && span_style_value !== (span_style_value = "" + ((/*vertical*/ ctx[2] ? "top" : "left") + ": 0%;"))) {
    				attr_dev(span, "style", span_style_value);
    			}

    			if (dirty & /*isSelected, min*/ 16385) {
    				toggle_class(span, "selected", /*isSelected*/ ctx[14](/*min*/ ctx[0]));
    			}

    			if (dirty & /*inRange, min*/ 32769) {
    				toggle_class(span, "in-range", /*inRange*/ ctx[15](/*min*/ ctx[0]));
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(137:2) {#if ( all && first !== false ) || first }",
    		ctx
    	});

    	return block;
    }

    // (143:6) {#if all === 'label' || first === 'label'}
    function create_if_block_6(ctx) {
    	let span;
    	let t0;
    	let t1_value = /*formatter*/ ctx[9](/*min*/ ctx[0]) + "";
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t0 = text(/*prefix*/ ctx[7]);
    			t1 = text(t1_value);
    			t2 = text(/*suffix*/ ctx[8]);
    			attr_dev(span, "class", "pipVal");
    			add_location(span, file$6, 143, 8, 3575);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			append_dev(span, t1);
    			append_dev(span, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*prefix*/ 128) set_data_dev(t0, /*prefix*/ ctx[7]);
    			if (dirty & /*formatter, min*/ 513 && t1_value !== (t1_value = /*formatter*/ ctx[9](/*min*/ ctx[0]) + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*suffix*/ 256) set_data_dev(t2, /*suffix*/ ctx[8]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(143:6) {#if all === 'label' || first === 'label'}",
    		ctx
    	});

    	return block;
    }

    // (150:2) {#if ( all && rest !== false ) || rest}
    function create_if_block_2(ctx) {
    	let each_1_anchor;
    	let each_value = Array(/*pipCount*/ ctx[12] + 1);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*vertical, percentOf, pipVal, isSelected, inRange, suffix, formatter, prefix, all, rest, min, max, pipCount*/ 64463) {
    				each_value = Array(/*pipCount*/ ctx[12] + 1);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(150:2) {#if ( all && rest !== false ) || rest}",
    		ctx
    	});

    	return block;
    }

    // (152:6) {#if pipVal(i) !== min && pipVal(i) !== max}
    function create_if_block_3(ctx) {
    	let span;
    	let t;
    	let span_style_value;
    	let if_block = (/*all*/ ctx[3] === "label" || /*rest*/ ctx[6] === "label") && create_if_block_4(ctx);

    	const block = {
    		c: function create() {
    			span = element("span");
    			if (if_block) if_block.c();
    			t = space();
    			attr_dev(span, "class", "pip");
    			attr_dev(span, "style", span_style_value = "" + ((/*vertical*/ ctx[2] ? "top" : "left") + ": " + /*percentOf*/ ctx[11](/*pipVal*/ ctx[13](/*i*/ ctx[23])) + "%;"));
    			toggle_class(span, "selected", /*isSelected*/ ctx[14](/*pipVal*/ ctx[13](/*i*/ ctx[23])));
    			toggle_class(span, "in-range", /*inRange*/ ctx[15](/*pipVal*/ ctx[13](/*i*/ ctx[23])));
    			add_location(span, file$6, 152, 8, 3829);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			if (if_block) if_block.m(span, null);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (/*all*/ ctx[3] === "label" || /*rest*/ ctx[6] === "label") {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_4(ctx);
    					if_block.c();
    					if_block.m(span, t);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*vertical, percentOf, pipVal*/ 10244 && span_style_value !== (span_style_value = "" + ((/*vertical*/ ctx[2] ? "top" : "left") + ": " + /*percentOf*/ ctx[11](/*pipVal*/ ctx[13](/*i*/ ctx[23])) + "%;"))) {
    				attr_dev(span, "style", span_style_value);
    			}

    			if (dirty & /*isSelected, pipVal*/ 24576) {
    				toggle_class(span, "selected", /*isSelected*/ ctx[14](/*pipVal*/ ctx[13](/*i*/ ctx[23])));
    			}

    			if (dirty & /*inRange, pipVal*/ 40960) {
    				toggle_class(span, "in-range", /*inRange*/ ctx[15](/*pipVal*/ ctx[13](/*i*/ ctx[23])));
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(152:6) {#if pipVal(i) !== min && pipVal(i) !== max}",
    		ctx
    	});

    	return block;
    }

    // (158:10) {#if all === 'label' || rest === 'label'}
    function create_if_block_4(ctx) {
    	let span;
    	let t0;
    	let t1_value = /*formatter*/ ctx[9](/*pipVal*/ ctx[13](/*i*/ ctx[23])) + "";
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t0 = text(/*prefix*/ ctx[7]);
    			t1 = text(t1_value);
    			t2 = text(/*suffix*/ ctx[8]);
    			attr_dev(span, "class", "pipVal");
    			add_location(span, file$6, 158, 12, 4089);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			append_dev(span, t1);
    			append_dev(span, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*prefix*/ 128) set_data_dev(t0, /*prefix*/ ctx[7]);
    			if (dirty & /*formatter, pipVal*/ 8704 && t1_value !== (t1_value = /*formatter*/ ctx[9](/*pipVal*/ ctx[13](/*i*/ ctx[23])) + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*suffix*/ 256) set_data_dev(t2, /*suffix*/ ctx[8]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(158:10) {#if all === 'label' || rest === 'label'}",
    		ctx
    	});

    	return block;
    }

    // (151:4) {#each Array(pipCount + 1) as _, i}
    function create_each_block$1(ctx) {
    	let show_if = /*pipVal*/ ctx[13](/*i*/ ctx[23]) !== /*min*/ ctx[0] && /*pipVal*/ ctx[13](/*i*/ ctx[23]) !== /*max*/ ctx[1];
    	let if_block_anchor;
    	let if_block = show_if && create_if_block_3(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*pipVal, min, max*/ 8195) show_if = /*pipVal*/ ctx[13](/*i*/ ctx[23]) !== /*min*/ ctx[0] && /*pipVal*/ ctx[13](/*i*/ ctx[23]) !== /*max*/ ctx[1];

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_3(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(151:4) {#each Array(pipCount + 1) as _, i}",
    		ctx
    	});

    	return block;
    }

    // (167:2) {#if ( all && last !== false ) || last}
    function create_if_block(ctx) {
    	let span;
    	let span_style_value;
    	let if_block = (/*all*/ ctx[3] === "label" || /*last*/ ctx[5] === "label") && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			span = element("span");
    			if (if_block) if_block.c();
    			attr_dev(span, "class", "pip last");
    			attr_dev(span, "style", span_style_value = "" + ((/*vertical*/ ctx[2] ? "top" : "left") + ": 100%;"));
    			toggle_class(span, "selected", /*isSelected*/ ctx[14](/*max*/ ctx[1]));
    			toggle_class(span, "in-range", /*inRange*/ ctx[15](/*max*/ ctx[1]));
    			add_location(span, file$6, 167, 4, 4294);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			if (if_block) if_block.m(span, null);
    		},
    		p: function update(ctx, dirty) {
    			if (/*all*/ ctx[3] === "label" || /*last*/ ctx[5] === "label") {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(span, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*vertical*/ 4 && span_style_value !== (span_style_value = "" + ((/*vertical*/ ctx[2] ? "top" : "left") + ": 100%;"))) {
    				attr_dev(span, "style", span_style_value);
    			}

    			if (dirty & /*isSelected, max*/ 16386) {
    				toggle_class(span, "selected", /*isSelected*/ ctx[14](/*max*/ ctx[1]));
    			}

    			if (dirty & /*inRange, max*/ 32770) {
    				toggle_class(span, "in-range", /*inRange*/ ctx[15](/*max*/ ctx[1]));
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(167:2) {#if ( all && last !== false ) || last}",
    		ctx
    	});

    	return block;
    }

    // (173:6) {#if all === 'label' || last === 'label'}
    function create_if_block_1(ctx) {
    	let span;
    	let t0;
    	let t1_value = /*formatter*/ ctx[9](/*max*/ ctx[1]) + "";
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t0 = text(/*prefix*/ ctx[7]);
    			t1 = text(t1_value);
    			t2 = text(/*suffix*/ ctx[8]);
    			attr_dev(span, "class", "pipVal");
    			add_location(span, file$6, 173, 8, 4504);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			append_dev(span, t1);
    			append_dev(span, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*prefix*/ 128) set_data_dev(t0, /*prefix*/ ctx[7]);
    			if (dirty & /*formatter, max*/ 514 && t1_value !== (t1_value = /*formatter*/ ctx[9](/*max*/ ctx[1]) + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*suffix*/ 256) set_data_dev(t2, /*suffix*/ ctx[8]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(173:6) {#if all === 'label' || last === 'label'}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let if_block0 = (/*all*/ ctx[3] && /*first*/ ctx[4] !== false || /*first*/ ctx[4]) && create_if_block_5(ctx);
    	let if_block1 = (/*all*/ ctx[3] && /*rest*/ ctx[6] !== false || /*rest*/ ctx[6]) && create_if_block_2(ctx);
    	let if_block2 = (/*all*/ ctx[3] && /*last*/ ctx[5] !== false || /*last*/ ctx[5]) && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			attr_dev(div, "class", "rangePips");
    			toggle_class(div, "focus", /*focus*/ ctx[10]);
    			toggle_class(div, "vertical", /*vertical*/ ctx[2]);
    			add_location(div, file$6, 135, 0, 3265);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block0) if_block0.m(div, null);
    			append_dev(div, t0);
    			if (if_block1) if_block1.m(div, null);
    			append_dev(div, t1);
    			if (if_block2) if_block2.m(div, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*all*/ ctx[3] && /*first*/ ctx[4] !== false || /*first*/ ctx[4]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_5(ctx);
    					if_block0.c();
    					if_block0.m(div, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*all*/ ctx[3] && /*rest*/ ctx[6] !== false || /*rest*/ ctx[6]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_2(ctx);
    					if_block1.c();
    					if_block1.m(div, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*all*/ ctx[3] && /*last*/ ctx[5] !== false || /*last*/ ctx[5]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block(ctx);
    					if_block2.c();
    					if_block2.m(div, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (dirty & /*focus*/ 1024) {
    				toggle_class(div, "focus", /*focus*/ ctx[10]);
    			}

    			if (dirty & /*vertical*/ 4) {
    				toggle_class(div, "vertical", /*vertical*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("RangePips", slots, []);
    	let { range = false } = $$props;
    	let { min = 0 } = $$props;
    	let { max = 100 } = $$props;
    	let { step = 1 } = $$props;
    	let { values = [(max + min) / 2] } = $$props;
    	let { vertical = false } = $$props;
    	let { pipstep = undefined } = $$props;
    	let { all = true } = $$props;
    	let { first = undefined } = $$props;
    	let { last = undefined } = $$props;
    	let { rest = undefined } = $$props;
    	let { prefix = "" } = $$props;
    	let { suffix = "" } = $$props;
    	let { formatter = v => v } = $$props;
    	let { focus = undefined } = $$props;
    	let { percentOf = undefined } = $$props;

    	const writable_props = [
    		"range",
    		"min",
    		"max",
    		"step",
    		"values",
    		"vertical",
    		"pipstep",
    		"all",
    		"first",
    		"last",
    		"rest",
    		"prefix",
    		"suffix",
    		"formatter",
    		"focus",
    		"percentOf"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<RangePips> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("range" in $$props) $$invalidate(16, range = $$props.range);
    		if ("min" in $$props) $$invalidate(0, min = $$props.min);
    		if ("max" in $$props) $$invalidate(1, max = $$props.max);
    		if ("step" in $$props) $$invalidate(17, step = $$props.step);
    		if ("values" in $$props) $$invalidate(18, values = $$props.values);
    		if ("vertical" in $$props) $$invalidate(2, vertical = $$props.vertical);
    		if ("pipstep" in $$props) $$invalidate(19, pipstep = $$props.pipstep);
    		if ("all" in $$props) $$invalidate(3, all = $$props.all);
    		if ("first" in $$props) $$invalidate(4, first = $$props.first);
    		if ("last" in $$props) $$invalidate(5, last = $$props.last);
    		if ("rest" in $$props) $$invalidate(6, rest = $$props.rest);
    		if ("prefix" in $$props) $$invalidate(7, prefix = $$props.prefix);
    		if ("suffix" in $$props) $$invalidate(8, suffix = $$props.suffix);
    		if ("formatter" in $$props) $$invalidate(9, formatter = $$props.formatter);
    		if ("focus" in $$props) $$invalidate(10, focus = $$props.focus);
    		if ("percentOf" in $$props) $$invalidate(11, percentOf = $$props.percentOf);
    	};

    	$$self.$capture_state = () => ({
    		range,
    		min,
    		max,
    		step,
    		values,
    		vertical,
    		pipstep,
    		all,
    		first,
    		last,
    		rest,
    		prefix,
    		suffix,
    		formatter,
    		focus,
    		percentOf,
    		pipStep,
    		pipCount,
    		pipVal,
    		isSelected,
    		inRange
    	});

    	$$self.$inject_state = $$props => {
    		if ("range" in $$props) $$invalidate(16, range = $$props.range);
    		if ("min" in $$props) $$invalidate(0, min = $$props.min);
    		if ("max" in $$props) $$invalidate(1, max = $$props.max);
    		if ("step" in $$props) $$invalidate(17, step = $$props.step);
    		if ("values" in $$props) $$invalidate(18, values = $$props.values);
    		if ("vertical" in $$props) $$invalidate(2, vertical = $$props.vertical);
    		if ("pipstep" in $$props) $$invalidate(19, pipstep = $$props.pipstep);
    		if ("all" in $$props) $$invalidate(3, all = $$props.all);
    		if ("first" in $$props) $$invalidate(4, first = $$props.first);
    		if ("last" in $$props) $$invalidate(5, last = $$props.last);
    		if ("rest" in $$props) $$invalidate(6, rest = $$props.rest);
    		if ("prefix" in $$props) $$invalidate(7, prefix = $$props.prefix);
    		if ("suffix" in $$props) $$invalidate(8, suffix = $$props.suffix);
    		if ("formatter" in $$props) $$invalidate(9, formatter = $$props.formatter);
    		if ("focus" in $$props) $$invalidate(10, focus = $$props.focus);
    		if ("percentOf" in $$props) $$invalidate(11, percentOf = $$props.percentOf);
    		if ("pipStep" in $$props) $$invalidate(20, pipStep = $$props.pipStep);
    		if ("pipCount" in $$props) $$invalidate(12, pipCount = $$props.pipCount);
    		if ("pipVal" in $$props) $$invalidate(13, pipVal = $$props.pipVal);
    		if ("isSelected" in $$props) $$invalidate(14, isSelected = $$props.isSelected);
    		if ("inRange" in $$props) $$invalidate(15, inRange = $$props.inRange);
    	};

    	let pipStep;
    	let pipCount;
    	let pipVal;
    	let isSelected;
    	let inRange;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*pipstep, max, min, step, vertical*/ 655367) {
    			 $$invalidate(20, pipStep = pipstep || ((max - min) / step >= (vertical ? 50 : 100)
    			? (max - min) / (vertical ? 10 : 20)
    			: 1));
    		}

    		if ($$self.$$.dirty & /*max, min, step, pipStep*/ 1179651) {
    			 $$invalidate(12, pipCount = parseInt((max - min) / (step * pipStep), 10));
    		}

    		if ($$self.$$.dirty & /*min, step, pipStep*/ 1179649) {
    			 $$invalidate(13, pipVal = function (val) {
    				return min + val * step * pipStep;
    			});
    		}

    		if ($$self.$$.dirty & /*values*/ 262144) {
    			 $$invalidate(14, isSelected = function (val) {
    				return values.some(v => v === val);
    			});
    		}

    		if ($$self.$$.dirty & /*range, values*/ 327680) {
    			 $$invalidate(15, inRange = function (val) {
    				if (range === "min") {
    					return values[0] > val;
    				} else if (range === "max") {
    					return values[0] < val;
    				} else if (range) {
    					return values[0] < val && values[1] > val;
    				}
    			});
    		}
    	};

    	return [
    		min,
    		max,
    		vertical,
    		all,
    		first,
    		last,
    		rest,
    		prefix,
    		suffix,
    		formatter,
    		focus,
    		percentOf,
    		pipCount,
    		pipVal,
    		isSelected,
    		inRange,
    		range,
    		step,
    		values,
    		pipstep
    	];
    }

    class RangePips extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {
    			range: 16,
    			min: 0,
    			max: 1,
    			step: 17,
    			values: 18,
    			vertical: 2,
    			pipstep: 19,
    			all: 3,
    			first: 4,
    			last: 5,
    			rest: 6,
    			prefix: 7,
    			suffix: 8,
    			formatter: 9,
    			focus: 10,
    			percentOf: 11
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "RangePips",
    			options,
    			id: create_fragment$6.name
    		});
    	}

    	get range() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set range(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get min() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set min(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get max() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set max(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get step() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set step(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get values() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set values(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get vertical() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set vertical(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pipstep() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pipstep(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get all() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set all(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get first() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set first(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get last() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set last(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get rest() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set rest(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get prefix() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set prefix(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get suffix() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set suffix(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get formatter() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set formatter(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get focus() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set focus(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get percentOf() {
    		throw new Error("<RangePips>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set percentOf(value) {
    		throw new Error("<RangePips>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-range-slider-pips/src/RangeSlider.svelte generated by Svelte v3.29.7 */
    const file$7 = "node_modules/svelte-range-slider-pips/src/RangeSlider.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[50] = list[i];
    	child_ctx[52] = i;
    	return child_ctx;
    }

    // (628:6) {#if float}
    function create_if_block_2$1(ctx) {
    	let span;
    	let t0;
    	let t1_value = /*handleFormatter*/ ctx[18](/*value*/ ctx[50]) + "";
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t0 = text(/*prefix*/ ctx[15]);
    			t1 = text(t1_value);
    			t2 = text(/*suffix*/ ctx[16]);
    			attr_dev(span, "class", "rangeFloat");
    			add_location(span, file$7, 628, 8, 18055);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			append_dev(span, t1);
    			append_dev(span, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*prefix*/ 32768) set_data_dev(t0, /*prefix*/ ctx[15]);
    			if (dirty[0] & /*handleFormatter, values*/ 262145 && t1_value !== (t1_value = /*handleFormatter*/ ctx[18](/*value*/ ctx[50]) + "")) set_data_dev(t1, t1_value);
    			if (dirty[0] & /*suffix*/ 65536) set_data_dev(t2, /*suffix*/ ctx[16]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(628:6) {#if float}",
    		ctx
    	});

    	return block;
    }

    // (611:2) {#each values as value, index}
    function create_each_block$2(ctx) {
    	let span1;
    	let span0;
    	let t;
    	let span1_style_value;
    	let span1_aria_valuemin_value;
    	let span1_aria_valuemax_value;
    	let span1_aria_valuenow_value;
    	let span1_aria_valuetext_value;
    	let span1_aria_orientation_value;
    	let mounted;
    	let dispose;
    	let if_block = /*float*/ ctx[6] && create_if_block_2$1(ctx);

    	const block = {
    		c: function create() {
    			span1 = element("span");
    			span0 = element("span");
    			t = space();
    			if (if_block) if_block.c();
    			attr_dev(span0, "class", "rangeNub");
    			add_location(span0, file$7, 626, 6, 18003);
    			attr_dev(span1, "role", "slider");
    			attr_dev(span1, "class", "rangeHandle");
    			attr_dev(span1, "tabindex", "0");
    			attr_dev(span1, "style", span1_style_value = "" + ((/*vertical*/ ctx[5] ? "top" : "left") + ": " + /*$springPositions*/ ctx[23][/*index*/ ctx[52]] + "%; z-index: " + (/*activeHandle*/ ctx[21] === /*index*/ ctx[52] ? 3 : 2) + ";"));

    			attr_dev(span1, "aria-valuemin", span1_aria_valuemin_value = /*range*/ ctx[1] === true && /*index*/ ctx[52] === 1
    			? /*values*/ ctx[0][0]
    			: /*min*/ ctx[2]);

    			attr_dev(span1, "aria-valuemax", span1_aria_valuemax_value = /*range*/ ctx[1] === true && /*index*/ ctx[52] === 0
    			? /*values*/ ctx[0][1]
    			: /*max*/ ctx[3]);

    			attr_dev(span1, "aria-valuenow", span1_aria_valuenow_value = /*value*/ ctx[50]);
    			attr_dev(span1, "aria-valuetext", span1_aria_valuetext_value = "" + (/*prefix*/ ctx[15] + /*handleFormatter*/ ctx[18](/*value*/ ctx[50]) + /*suffix*/ ctx[16]));
    			attr_dev(span1, "aria-orientation", span1_aria_orientation_value = /*vertical*/ ctx[5] ? "vertical" : "horizontal");
    			toggle_class(span1, "hoverable", /*hover*/ ctx[7]);
    			toggle_class(span1, "active", /*focus*/ ctx[20] && /*activeHandle*/ ctx[21] === /*index*/ ctx[52]);
    			add_location(span1, file$7, 611, 4, 17333);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span1, anchor);
    			append_dev(span1, span0);
    			append_dev(span1, t);
    			if (if_block) if_block.m(span1, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(span1, "blur", /*sliderBlurHandle*/ ctx[27], false, false, false),
    					listen_dev(span1, "focus", /*sliderFocusHandle*/ ctx[28], false, false, false),
    					listen_dev(span1, "keydown", /*sliderKeydown*/ ctx[29], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*float*/ ctx[6]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_2$1(ctx);
    					if_block.c();
    					if_block.m(span1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty[0] & /*vertical, $springPositions, activeHandle*/ 10485792 && span1_style_value !== (span1_style_value = "" + ((/*vertical*/ ctx[5] ? "top" : "left") + ": " + /*$springPositions*/ ctx[23][/*index*/ ctx[52]] + "%; z-index: " + (/*activeHandle*/ ctx[21] === /*index*/ ctx[52] ? 3 : 2) + ";"))) {
    				attr_dev(span1, "style", span1_style_value);
    			}

    			if (dirty[0] & /*range, values, min*/ 7 && span1_aria_valuemin_value !== (span1_aria_valuemin_value = /*range*/ ctx[1] === true && /*index*/ ctx[52] === 1
    			? /*values*/ ctx[0][0]
    			: /*min*/ ctx[2])) {
    				attr_dev(span1, "aria-valuemin", span1_aria_valuemin_value);
    			}

    			if (dirty[0] & /*range, values, max*/ 11 && span1_aria_valuemax_value !== (span1_aria_valuemax_value = /*range*/ ctx[1] === true && /*index*/ ctx[52] === 0
    			? /*values*/ ctx[0][1]
    			: /*max*/ ctx[3])) {
    				attr_dev(span1, "aria-valuemax", span1_aria_valuemax_value);
    			}

    			if (dirty[0] & /*values*/ 1 && span1_aria_valuenow_value !== (span1_aria_valuenow_value = /*value*/ ctx[50])) {
    				attr_dev(span1, "aria-valuenow", span1_aria_valuenow_value);
    			}

    			if (dirty[0] & /*prefix, handleFormatter, values, suffix*/ 360449 && span1_aria_valuetext_value !== (span1_aria_valuetext_value = "" + (/*prefix*/ ctx[15] + /*handleFormatter*/ ctx[18](/*value*/ ctx[50]) + /*suffix*/ ctx[16]))) {
    				attr_dev(span1, "aria-valuetext", span1_aria_valuetext_value);
    			}

    			if (dirty[0] & /*vertical*/ 32 && span1_aria_orientation_value !== (span1_aria_orientation_value = /*vertical*/ ctx[5] ? "vertical" : "horizontal")) {
    				attr_dev(span1, "aria-orientation", span1_aria_orientation_value);
    			}

    			if (dirty[0] & /*hover*/ 128) {
    				toggle_class(span1, "hoverable", /*hover*/ ctx[7]);
    			}

    			if (dirty[0] & /*focus, activeHandle*/ 3145728) {
    				toggle_class(span1, "active", /*focus*/ ctx[20] && /*activeHandle*/ ctx[21] === /*index*/ ctx[52]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span1);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(611:2) {#each values as value, index}",
    		ctx
    	});

    	return block;
    }

    // (633:2) {#if range}
    function create_if_block_1$1(ctx) {
    	let span;
    	let span_style_value;

    	const block = {
    		c: function create() {
    			span = element("span");
    			attr_dev(span, "class", "rangeBar");
    			attr_dev(span, "style", span_style_value = "" + ((/*vertical*/ ctx[5] ? "top" : "left") + ": " + /*rangeStart*/ ctx[25](/*$springPositions*/ ctx[23]) + "%; " + (/*vertical*/ ctx[5] ? "bottom" : "right") + ":\n      " + /*rangeEnd*/ ctx[26](/*$springPositions*/ ctx[23]) + "%;"));
    			add_location(span, file$7, 633, 4, 18180);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*vertical, $springPositions*/ 8388640 && span_style_value !== (span_style_value = "" + ((/*vertical*/ ctx[5] ? "top" : "left") + ": " + /*rangeStart*/ ctx[25](/*$springPositions*/ ctx[23]) + "%; " + (/*vertical*/ ctx[5] ? "bottom" : "right") + ":\n      " + /*rangeEnd*/ ctx[26](/*$springPositions*/ ctx[23]) + "%;"))) {
    				attr_dev(span, "style", span_style_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(633:2) {#if range}",
    		ctx
    	});

    	return block;
    }

    // (639:2) {#if pips}
    function create_if_block$1(ctx) {
    	let rangepips;
    	let current;

    	rangepips = new RangePips({
    			props: {
    				values: /*values*/ ctx[0],
    				min: /*min*/ ctx[2],
    				max: /*max*/ ctx[3],
    				step: /*step*/ ctx[4],
    				range: /*range*/ ctx[1],
    				vertical: /*vertical*/ ctx[5],
    				all: /*all*/ ctx[10],
    				first: /*first*/ ctx[11],
    				last: /*last*/ ctx[12],
    				rest: /*rest*/ ctx[13],
    				pipstep: /*pipstep*/ ctx[9],
    				prefix: /*prefix*/ ctx[15],
    				suffix: /*suffix*/ ctx[16],
    				formatter: /*formatter*/ ctx[17],
    				focus: /*focus*/ ctx[20],
    				percentOf: /*percentOf*/ ctx[22]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(rangepips.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(rangepips, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const rangepips_changes = {};
    			if (dirty[0] & /*values*/ 1) rangepips_changes.values = /*values*/ ctx[0];
    			if (dirty[0] & /*min*/ 4) rangepips_changes.min = /*min*/ ctx[2];
    			if (dirty[0] & /*max*/ 8) rangepips_changes.max = /*max*/ ctx[3];
    			if (dirty[0] & /*step*/ 16) rangepips_changes.step = /*step*/ ctx[4];
    			if (dirty[0] & /*range*/ 2) rangepips_changes.range = /*range*/ ctx[1];
    			if (dirty[0] & /*vertical*/ 32) rangepips_changes.vertical = /*vertical*/ ctx[5];
    			if (dirty[0] & /*all*/ 1024) rangepips_changes.all = /*all*/ ctx[10];
    			if (dirty[0] & /*first*/ 2048) rangepips_changes.first = /*first*/ ctx[11];
    			if (dirty[0] & /*last*/ 4096) rangepips_changes.last = /*last*/ ctx[12];
    			if (dirty[0] & /*rest*/ 8192) rangepips_changes.rest = /*rest*/ ctx[13];
    			if (dirty[0] & /*pipstep*/ 512) rangepips_changes.pipstep = /*pipstep*/ ctx[9];
    			if (dirty[0] & /*prefix*/ 32768) rangepips_changes.prefix = /*prefix*/ ctx[15];
    			if (dirty[0] & /*suffix*/ 65536) rangepips_changes.suffix = /*suffix*/ ctx[16];
    			if (dirty[0] & /*formatter*/ 131072) rangepips_changes.formatter = /*formatter*/ ctx[17];
    			if (dirty[0] & /*focus*/ 1048576) rangepips_changes.focus = /*focus*/ ctx[20];
    			if (dirty[0] & /*percentOf*/ 4194304) rangepips_changes.percentOf = /*percentOf*/ ctx[22];
    			rangepips.$set(rangepips_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(rangepips.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(rangepips.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(rangepips, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(639:2) {#if pips}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*values*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	let if_block0 = /*range*/ ctx[1] && create_if_block_1$1(ctx);
    	let if_block1 = /*pips*/ ctx[8] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(div, "id", /*id*/ ctx[14]);
    			attr_dev(div, "class", "rangeSlider");
    			toggle_class(div, "min", /*range*/ ctx[1] === "min");
    			toggle_class(div, "range", /*range*/ ctx[1]);
    			toggle_class(div, "vertical", /*vertical*/ ctx[5]);
    			toggle_class(div, "focus", /*focus*/ ctx[20]);
    			toggle_class(div, "max", /*range*/ ctx[1] === "max");
    			toggle_class(div, "pips", /*pips*/ ctx[8]);
    			toggle_class(div, "pip-labels", /*all*/ ctx[10] === "label" || /*first*/ ctx[11] === "label" || /*last*/ ctx[12] === "label" || /*rest*/ ctx[13] === "label");
    			add_location(div, file$7, 597, 0, 16934);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append_dev(div, t0);
    			if (if_block0) if_block0.m(div, null);
    			append_dev(div, t1);
    			if (if_block1) if_block1.m(div, null);
    			/*div_binding*/ ctx[38](div);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(window, "mousedown", /*bodyInteractStart*/ ctx[31], false, false, false),
    					listen_dev(window, "touchstart", /*bodyInteractStart*/ ctx[31], false, false, false),
    					listen_dev(window, "mousemove", /*bodyInteract*/ ctx[32], false, false, false),
    					listen_dev(window, "touchmove", /*bodyInteract*/ ctx[32], false, false, false),
    					listen_dev(window, "mouseup", /*bodyMouseUp*/ ctx[33], false, false, false),
    					listen_dev(window, "touchend", /*bodyTouchEnd*/ ctx[34], false, false, false),
    					listen_dev(window, "keydown", /*bodyKeyDown*/ ctx[35], false, false, false),
    					listen_dev(div, "touchstart", prevent_default(/*sliderInteractStart*/ ctx[30]), false, true, false),
    					listen_dev(div, "mousedown", /*sliderInteractStart*/ ctx[30], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*vertical, $springPositions, activeHandle, range, values, min, max, prefix, handleFormatter, suffix, hover, focus, sliderKeydown, sliderBlurHandle, sliderFocusHandle, float*/ 951419119) {
    				each_value = /*values*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, t0);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (/*range*/ ctx[1]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1$1(ctx);
    					if_block0.c();
    					if_block0.m(div, t1);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*pips*/ ctx[8]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty[0] & /*pips*/ 256) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block$1(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty[0] & /*id*/ 16384) {
    				attr_dev(div, "id", /*id*/ ctx[14]);
    			}

    			if (dirty[0] & /*range*/ 2) {
    				toggle_class(div, "min", /*range*/ ctx[1] === "min");
    			}

    			if (dirty[0] & /*range*/ 2) {
    				toggle_class(div, "range", /*range*/ ctx[1]);
    			}

    			if (dirty[0] & /*vertical*/ 32) {
    				toggle_class(div, "vertical", /*vertical*/ ctx[5]);
    			}

    			if (dirty[0] & /*focus*/ 1048576) {
    				toggle_class(div, "focus", /*focus*/ ctx[20]);
    			}

    			if (dirty[0] & /*range*/ 2) {
    				toggle_class(div, "max", /*range*/ ctx[1] === "max");
    			}

    			if (dirty[0] & /*pips*/ 256) {
    				toggle_class(div, "pips", /*pips*/ ctx[8]);
    			}

    			if (dirty[0] & /*all, first, last, rest*/ 15360) {
    				toggle_class(div, "pip-labels", /*all*/ ctx[10] === "label" || /*first*/ ctx[11] === "label" || /*last*/ ctx[12] === "label" || /*rest*/ ctx[13] === "label");
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			/*div_binding*/ ctx[38](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function index(el) {
    	if (!el) return -1;
    	var i = 0;

    	while (el = el.previousElementSibling) {
    		i++;
    	}

    	return i;
    }

    /**
     * noramlise a mouse or touch event to return the
     * client (x/y) object for that event
     * @param {event} e a mouse/touch event to normalise
     * @returns {object} normalised event client object (x,y)
     **/
    function normalisedClient(e) {
    	if (e.type.includes("touch")) {
    		return e.touches[0];
    	} else {
    		return e;
    	}
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let $springPositions;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("RangeSlider", slots, []);
    	let { range = false } = $$props;
    	let { min = 0 } = $$props;
    	let { max = 100 } = $$props;
    	let { step = 1 } = $$props;
    	let { values = [(max + min) / 2] } = $$props;
    	let { vertical = false } = $$props;
    	let { float = false } = $$props;
    	let { hover = true } = $$props;
    	let { pips = false } = $$props;
    	let { pipstep = undefined } = $$props;
    	let { all = undefined } = $$props;
    	let { first = undefined } = $$props;
    	let { last = undefined } = $$props;
    	let { rest = undefined } = $$props;
    	let { id = undefined } = $$props;
    	let { prefix = "" } = $$props;
    	let { suffix = "" } = $$props;
    	let { formatter = v => v } = $$props;
    	let { handleFormatter = formatter } = $$props;
    	let { precision = 2 } = $$props;
    	let { springValues = { stiffness: 0.15, damping: 0.4 } } = $$props;

    	// dom references
    	let slider;

    	// state management
    	let focus = false;

    	let handleActivated = false;
    	let keyboardActive = false;
    	let activeHandle = values.length - 1;

    	// save spring-tweened copies of the values for use
    	// when changing values and animating the handle/range nicely
    	let springPositions = spring(values.map(v => parseFloat(((v - min) / (max - min) * 100).toFixed(precision))), springValues);

    	validate_store(springPositions, "springPositions");
    	component_subscribe($$self, springPositions, value => $$invalidate(23, $springPositions = value));

    	/**
     * get the position (x/y) of a mouse/touch event on the screen
     * @param {event} e a mouse/touch event
     * @returns {object} position on screen (x,y)
     **/
    	function eventPosition(e) {
    		return vertical
    		? normalisedClient(e).clientY
    		: normalisedClient(e).clientX;
    	}

    	/**
     * check if an element is a handle on the slider
     * @param {object} el dom object reference we want to check
     * @returns {boolean}
     **/
    	function targetIsHandle(el) {
    		const handles = slider.querySelectorAll(".handle");
    		const isHandle = Array.prototype.includes.call(handles, el);
    		const isChild = Array.prototype.some.call(handles, e => e.contains(el));
    		return isHandle || isChild;
    	}

    	/**
     * take in the value from the "range" parameter and see if
     * we should make a min/max/range slider.
     * @param {array} values the input values for the rangeSlider
     * @return {array} the range array for creating a rangeSlider
     **/
    	function trimRange(values) {
    		if (range === "min" || range === "max") {
    			return values.slice(0, 1);
    		} else if (range) {
    			return values.slice(0, 2);
    		} else {
    			return values;
    		}
    	}

    	/**
     * helper to return the slider dimensions for finding
     * the closest handle to user interaction
     * @return {object} the range slider DOM client rect
     **/
    	function getSliderDimensions() {
    		return slider.getBoundingClientRect();
    	}

    	/**
     * helper to return closest handle to user interaction
     * @param {number} clientPos the pixel (clientX/Y) to check against
     * @return {number} the index of the closest handle to clientPos
     **/
    	function getClosestHandle(clientPos) {
    		// first make sure we have the latest dimensions
    		// of the slider, as it may have changed size
    		const dims = getSliderDimensions();

    		// calculate the interaction position, percent and value
    		let iPos = 0;

    		let iPercent = 0;
    		let iVal = 0;

    		if (vertical) {
    			iPos = clientPos - dims.top;
    			iPercent = iPos / dims.height * 100;
    			iVal = (max - min) / 100 * iPercent + min;
    		} else {
    			iPos = clientPos - dims.left;
    			iPercent = iPos / dims.width * 100;
    			iVal = (max - min) / 100 * iPercent + min;
    		}

    		let closest;

    		// if we have a range, and the handles are at the same
    		// position, we want a simple check if the interaction
    		// value is greater than return the second handle
    		if (range === true && values[0] === values[1]) {
    			if (iVal > values[1]) {
    				return 1;
    			} else {
    				return 0;
    			}
    		} else // we sort the handles values, and return the first one closest
    		// to the interaction value
    		{
    			closest = values.indexOf([...values].sort((a, b) => Math.abs(iVal - a) - Math.abs(iVal - b))[0]); // if there are multiple handles, and not a range, then
    		}

    		return closest;
    	}

    	/**
     * take the interaction position on the slider, convert
     * it to a value on the range, and then send that value
     * through to the moveHandle() method to set the active
     * handle's position
     * @param {number} clientPos the clientX/Y of the interaction
     **/
    	function handleInteract(clientPos) {
    		// first make sure we have the latest dimensions
    		// of the slider, as it may have changed size
    		const dims = getSliderDimensions();

    		// calculate the interaction position, percent and value
    		let iPos = 0;

    		let iPercent = 0;
    		let iVal = 0;

    		if (vertical) {
    			iPos = clientPos - dims.top;
    			iPercent = iPos / dims.height * 100;
    			iVal = (max - min) / 100 * iPercent + min;
    		} else {
    			iPos = clientPos - dims.left;
    			iPercent = iPos / dims.width * 100;
    			iVal = (max - min) / 100 * iPercent + min;
    		}

    		// move handle to the value
    		moveHandle(activeHandle, iVal);
    	}

    	/**
     * move a handle to a specific value, respecting the clamp/align rules
     * @param {number} index the index of the handle we want to move
     * @param {number} value the value to move the handle to
     * @return {number} the value that was moved to (after alignment/clamping)
     **/
    	function moveHandle(index, value) {
    		// restrict the handles of a range-slider from
    		// going past one-another
    		if (range && index === 0 && value > values[1]) {
    			value = values[1];
    		} else if (range && index === 1 && value < values[0]) {
    			value = values[0];
    		}

    		// set the value for the handle, and align/clamp it
    		$$invalidate(0, values[index] = value, values);
    	}

    	/**
     * helper to find the beginning range value for use with css style
     * @param {array} values the input values for the rangeSlider
     * @return {number} the beginning of the range
     **/
    	function rangeStart(values) {
    		if (range === "min") {
    			return 0;
    		} else {
    			return values[0];
    		}
    	}

    	/**
     * helper to find the ending range value for use with css style
     * @param {array} values the input values for the rangeSlider
     * @return {number} the end of the range
     **/
    	function rangeEnd(values) {
    		if (range === "max") {
    			return 0;
    		} else if (range === "min") {
    			return 100 - values[0];
    		} else {
    			return 100 - values[1];
    		}
    	}

    	/**
     * when the user has unfocussed (blurred) from the
     * slider, deactivated all handles
     * @param {event} e the event from browser
     **/
    	function sliderBlurHandle(e) {
    		if (keyboardActive) {
    			$$invalidate(20, focus = false);
    			handleActivated = false;
    		}
    	}

    	/**
     * when the user focusses the handle of a slider
     * set it to be active
     * @param {event} e the event from browser
     **/
    	function sliderFocusHandle(e) {
    		$$invalidate(21, activeHandle = index(e.target));
    		$$invalidate(20, focus = true);
    	}

    	/**
     * handle the keyboard accessible features by checking the
     * input type, and modfier key then moving handle by appropriate amount
     * @param {event} e the event from browser
     **/
    	function sliderKeydown(e) {
    		const handle = index(e.target);
    		let jump = e.ctrlKey || e.metaKey || e.shiftKey ? step * 10 : step;
    		let prevent = false;

    		switch (e.key) {
    			case "PageDown":
    				jump *= 10;
    			case "ArrowRight":
    			case "ArrowUp":
    				moveHandle(handle, values[handle] + jump);
    				prevent = true;
    				break;
    			case "PageUp":
    				jump *= 10;
    			case "ArrowLeft":
    			case "ArrowDown":
    				moveHandle(handle, values[handle] - jump);
    				prevent = true;
    				break;
    			case "Home":
    				moveHandle(handle, min);
    				prevent = true;
    				break;
    			case "End":
    				moveHandle(handle, max);
    				prevent = true;
    				break;
    		}

    		if (prevent) {
    			e.preventDefault();
    			e.stopPropagation();
    		}
    	}

    	/**
     * function to run when the user touches
     * down on the slider element anywhere
     * @param {event} e the event from browser
     **/
    	function sliderInteractStart(e) {
    		const p = eventPosition(e);

    		// set the closest handle as active
    		$$invalidate(20, focus = true);

    		handleActivated = true;
    		$$invalidate(21, activeHandle = getClosestHandle(p));

    		// for touch devices we want the handle to instantly
    		// move to the position touched for more responsive feeling
    		if (e.type === "touchstart") {
    			handleInteract(p);
    		}
    	}

    	/**
     * unfocus the slider if the user clicked off of
     * it, somewhere else on the screen
     * @param {event} e the event from browser
     **/
    	function bodyInteractStart(e) {
    		keyboardActive = false;

    		if (focus && e.target !== slider && !slider.contains(e.target)) {
    			$$invalidate(20, focus = false);
    		}
    	}

    	/**
     * send the clientX through to handle the interaction
     * whenever the user moves acros screen while active
     * @param {event} e the event from browser
     **/
    	function bodyInteract(e) {
    		if (handleActivated) {
    			handleInteract(eventPosition(e));
    		}
    	}

    	/**
     * if user triggers mouseup on the body while
     * a handle is active (without moving) then we
     * trigger an interact event there
     * @param {event} e the event from browser
     **/
    	function bodyMouseUp(e) {
    		const el = e.target;

    		// this only works if a handle is active, which can
    		// only happen if there was sliderInteractStart triggered
    		// on the slider, already
    		if (handleActivated && (el === slider || slider.contains(el))) {
    			$$invalidate(20, focus = true);

    			if (!targetIsHandle(el)) {
    				handleInteract(eventPosition(e));
    			}
    		}

    		handleActivated = false;
    	}

    	/**
     * if user triggers touchend on the body then we
     * defocus the slider completely
     * @param {event} e the event from browser
     **/
    	function bodyTouchEnd(e) {
    		handleActivated = false;
    	}

    	function bodyKeyDown(e) {
    		if (e.target === slider || slider.contains(e.target)) {
    			keyboardActive = true;
    		}
    	}

    	const writable_props = [
    		"range",
    		"min",
    		"max",
    		"step",
    		"values",
    		"vertical",
    		"float",
    		"hover",
    		"pips",
    		"pipstep",
    		"all",
    		"first",
    		"last",
    		"rest",
    		"id",
    		"prefix",
    		"suffix",
    		"formatter",
    		"handleFormatter",
    		"precision",
    		"springValues"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<RangeSlider> was created with unknown prop '${key}'`);
    	});

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			slider = $$value;
    			$$invalidate(19, slider);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("range" in $$props) $$invalidate(1, range = $$props.range);
    		if ("min" in $$props) $$invalidate(2, min = $$props.min);
    		if ("max" in $$props) $$invalidate(3, max = $$props.max);
    		if ("step" in $$props) $$invalidate(4, step = $$props.step);
    		if ("values" in $$props) $$invalidate(0, values = $$props.values);
    		if ("vertical" in $$props) $$invalidate(5, vertical = $$props.vertical);
    		if ("float" in $$props) $$invalidate(6, float = $$props.float);
    		if ("hover" in $$props) $$invalidate(7, hover = $$props.hover);
    		if ("pips" in $$props) $$invalidate(8, pips = $$props.pips);
    		if ("pipstep" in $$props) $$invalidate(9, pipstep = $$props.pipstep);
    		if ("all" in $$props) $$invalidate(10, all = $$props.all);
    		if ("first" in $$props) $$invalidate(11, first = $$props.first);
    		if ("last" in $$props) $$invalidate(12, last = $$props.last);
    		if ("rest" in $$props) $$invalidate(13, rest = $$props.rest);
    		if ("id" in $$props) $$invalidate(14, id = $$props.id);
    		if ("prefix" in $$props) $$invalidate(15, prefix = $$props.prefix);
    		if ("suffix" in $$props) $$invalidate(16, suffix = $$props.suffix);
    		if ("formatter" in $$props) $$invalidate(17, formatter = $$props.formatter);
    		if ("handleFormatter" in $$props) $$invalidate(18, handleFormatter = $$props.handleFormatter);
    		if ("precision" in $$props) $$invalidate(36, precision = $$props.precision);
    		if ("springValues" in $$props) $$invalidate(37, springValues = $$props.springValues);
    	};

    	$$self.$capture_state = () => ({
    		spring,
    		RangePips,
    		range,
    		min,
    		max,
    		step,
    		values,
    		vertical,
    		float,
    		hover,
    		pips,
    		pipstep,
    		all,
    		first,
    		last,
    		rest,
    		id,
    		prefix,
    		suffix,
    		formatter,
    		handleFormatter,
    		precision,
    		springValues,
    		slider,
    		focus,
    		handleActivated,
    		keyboardActive,
    		activeHandle,
    		springPositions,
    		index,
    		normalisedClient,
    		eventPosition,
    		targetIsHandle,
    		trimRange,
    		getSliderDimensions,
    		getClosestHandle,
    		handleInteract,
    		moveHandle,
    		rangeStart,
    		rangeEnd,
    		sliderBlurHandle,
    		sliderFocusHandle,
    		sliderKeydown,
    		sliderInteractStart,
    		bodyInteractStart,
    		bodyInteract,
    		bodyMouseUp,
    		bodyTouchEnd,
    		bodyKeyDown,
    		alignValueToStep,
    		percentOf,
    		clampValue,
    		$springPositions
    	});

    	$$self.$inject_state = $$props => {
    		if ("range" in $$props) $$invalidate(1, range = $$props.range);
    		if ("min" in $$props) $$invalidate(2, min = $$props.min);
    		if ("max" in $$props) $$invalidate(3, max = $$props.max);
    		if ("step" in $$props) $$invalidate(4, step = $$props.step);
    		if ("values" in $$props) $$invalidate(0, values = $$props.values);
    		if ("vertical" in $$props) $$invalidate(5, vertical = $$props.vertical);
    		if ("float" in $$props) $$invalidate(6, float = $$props.float);
    		if ("hover" in $$props) $$invalidate(7, hover = $$props.hover);
    		if ("pips" in $$props) $$invalidate(8, pips = $$props.pips);
    		if ("pipstep" in $$props) $$invalidate(9, pipstep = $$props.pipstep);
    		if ("all" in $$props) $$invalidate(10, all = $$props.all);
    		if ("first" in $$props) $$invalidate(11, first = $$props.first);
    		if ("last" in $$props) $$invalidate(12, last = $$props.last);
    		if ("rest" in $$props) $$invalidate(13, rest = $$props.rest);
    		if ("id" in $$props) $$invalidate(14, id = $$props.id);
    		if ("prefix" in $$props) $$invalidate(15, prefix = $$props.prefix);
    		if ("suffix" in $$props) $$invalidate(16, suffix = $$props.suffix);
    		if ("formatter" in $$props) $$invalidate(17, formatter = $$props.formatter);
    		if ("handleFormatter" in $$props) $$invalidate(18, handleFormatter = $$props.handleFormatter);
    		if ("precision" in $$props) $$invalidate(36, precision = $$props.precision);
    		if ("springValues" in $$props) $$invalidate(37, springValues = $$props.springValues);
    		if ("slider" in $$props) $$invalidate(19, slider = $$props.slider);
    		if ("focus" in $$props) $$invalidate(20, focus = $$props.focus);
    		if ("handleActivated" in $$props) handleActivated = $$props.handleActivated;
    		if ("keyboardActive" in $$props) keyboardActive = $$props.keyboardActive;
    		if ("activeHandle" in $$props) $$invalidate(21, activeHandle = $$props.activeHandle);
    		if ("springPositions" in $$props) $$invalidate(24, springPositions = $$props.springPositions);
    		if ("alignValueToStep" in $$props) $$invalidate(41, alignValueToStep = $$props.alignValueToStep);
    		if ("percentOf" in $$props) $$invalidate(22, percentOf = $$props.percentOf);
    		if ("clampValue" in $$props) $$invalidate(42, clampValue = $$props.clampValue);
    	};

    	let percentOf;
    	let clampValue;
    	let alignValueToStep;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*min, max*/ 12) {
    			/**
     * clamp a value from the range so that it always
     * falls within the min/max values
     * @param {number} val the value to clamp
     * @return {number} the value after it's been clamped
     **/
    			 $$invalidate(42, clampValue = function (val) {
    				// return the min/max if outside of that range
    				return val <= min ? min : val >= max ? max : val;
    			});
    		}

    		if ($$self.$$.dirty[0] & /*min, max, step*/ 28 | $$self.$$.dirty[1] & /*clampValue, precision*/ 2080) {
    			/**
     * align the value with the steps so that it
     * always sits on the closest (above/below) step
     * @param {number} val the value to align
     * @return {number} the value after it's been aligned
     **/
    			 $$invalidate(41, alignValueToStep = function (val) {
    				// sanity check for performance
    				if (val <= min) {
    					return min;
    				} else if (val >= max) {
    					return max;
    				}

    				// find the middle-point between steps
    				// and see if the value is closer to the
    				// next step, or previous step
    				let remainder = (val - min) % step;

    				let aligned = val - remainder;

    				if (Math.abs(remainder) * 2 >= step) {
    					aligned += remainder > 0 ? step : -step;
    				}

    				// make sure the value is within acceptable limits
    				aligned = clampValue(aligned);

    				// make sure the returned value is set to the precision desired
    				// this is also because javascript often returns weird floats
    				// when dealing with odd numbers and percentages
    				return parseFloat(aligned.toFixed(precision));
    			});
    		}

    		if ($$self.$$.dirty[0] & /*values*/ 1 | $$self.$$.dirty[1] & /*alignValueToStep*/ 1024) {
    			// watch the values array, and trim / clamp the values to the steps
    			// and boundaries set up in the slider on change
    			 $$invalidate(0, values = trimRange(values).map(v => alignValueToStep(v)));
    		}

    		if ($$self.$$.dirty[0] & /*min, max*/ 12 | $$self.$$.dirty[1] & /*precision*/ 32) {
    			/**
     * take in a value, and then calculate that value's percentage
     * of the overall range (min-max);
     * @param {number} val the value we're getting percent for
     * @return {number} the percentage value
     **/
    			 $$invalidate(22, percentOf = function (val) {
    				let perc = (val - min) / (max - min) * 100;

    				if (perc >= 100) {
    					return 100;
    				} else if (perc <= 0) {
    					return 0;
    				} else {
    					return parseFloat(perc.toFixed(precision));
    				}
    			});
    		}

    		if ($$self.$$.dirty[0] & /*values, percentOf*/ 4194305) {
    			// update the spring function so that movement can happen in the UI
    			 {
    				springPositions.set(values.map(v => percentOf(v)));
    			}
    		}
    	};

    	return [
    		values,
    		range,
    		min,
    		max,
    		step,
    		vertical,
    		float,
    		hover,
    		pips,
    		pipstep,
    		all,
    		first,
    		last,
    		rest,
    		id,
    		prefix,
    		suffix,
    		formatter,
    		handleFormatter,
    		slider,
    		focus,
    		activeHandle,
    		percentOf,
    		$springPositions,
    		springPositions,
    		rangeStart,
    		rangeEnd,
    		sliderBlurHandle,
    		sliderFocusHandle,
    		sliderKeydown,
    		sliderInteractStart,
    		bodyInteractStart,
    		bodyInteract,
    		bodyMouseUp,
    		bodyTouchEnd,
    		bodyKeyDown,
    		precision,
    		springValues,
    		div_binding
    	];
    }

    class RangeSlider extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$7,
    			create_fragment$7,
    			safe_not_equal,
    			{
    				range: 1,
    				min: 2,
    				max: 3,
    				step: 4,
    				values: 0,
    				vertical: 5,
    				float: 6,
    				hover: 7,
    				pips: 8,
    				pipstep: 9,
    				all: 10,
    				first: 11,
    				last: 12,
    				rest: 13,
    				id: 14,
    				prefix: 15,
    				suffix: 16,
    				formatter: 17,
    				handleFormatter: 18,
    				precision: 36,
    				springValues: 37
    			},
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "RangeSlider",
    			options,
    			id: create_fragment$7.name
    		});
    	}

    	get range() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set range(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get min() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set min(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get max() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set max(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get step() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set step(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get values() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set values(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get vertical() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set vertical(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get float() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set float(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get hover() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set hover(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pips() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pips(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pipstep() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pipstep(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get all() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set all(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get first() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set first(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get last() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set last(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get rest() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set rest(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get prefix() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set prefix(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get suffix() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set suffix(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get formatter() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set formatter(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleFormatter() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleFormatter(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get precision() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set precision(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get springValues() {
    		throw new Error("<RangeSlider>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set springValues(value) {
    		throw new Error("<RangeSlider>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function Canvas(elem) {
      this.elem = elem;
      this.ctx = this.elem.getContext('2d');

      this.width = elem.width;
      this.height = elem.height;
    }

    Canvas.prototype.clear = function() {
      this.ctx.clearRect(0, 0, this.width, this.height);
    };

    Canvas.prototype.path = function(points, color) {
      this.ctx.beginPath();
      this.ctx.moveTo(points[0].x, points[0].y);

      for (var i = 1; i < points.length; i++) {
        this.ctx.lineTo(points[i].x, points[i].y);
      }

      this.ctx.closePath();

      /* Set the strokeStyle and fillStyle */
      this.ctx.save();

      this.ctx.globalAlpha = color.a;
      this.ctx.fillStyle = this.ctx.strokeStyle = color.toHex();
      this.ctx.stroke();
      this.ctx.fill();
      this.ctx.restore();
    };

    var canvas = Canvas;

    /**
     * A color instantiated with RGB between 0-255
     *
     * Also holds HSL values
     */
    function Color(r, g, b, a) {
      this.r = parseInt(r || 0);
      this.g = parseInt(g || 0);
      this.b = parseInt(b || 0);
      this.a = parseFloat((Math.round(a * 100) / 100 || 1));

      this.loadHSL();
    }
    Color.prototype.toHex = function() {
      // Pad with 0s
      var hex = (this.r * 256 * 256 + this.g * 256 + this.b).toString(16);

      if (hex.length < 6) {
        hex = new Array(6 - hex.length + 1).join('0') + hex;
      }

      return '#' + hex;
    };


    /**
     * Returns a lightened color based on a given percentage and an optional
     * light color
     */
    Color.prototype.lighten = function(percentage, lightColor) {
      lightColor = lightColor || new Color(255, 255, 255);

      var newColor = new Color(
        (lightColor.r / 255) * this.r,
        (lightColor.g / 255) * this.g,
        (lightColor.b / 255) * this.b,
        this.a
      );

      newColor.l = Math.min(newColor.l + percentage, 1);

      newColor.loadRGB();
      return newColor;
    };


    /**
     * Loads HSL values using the current RGB values
     * Converted from:
     * http://axonflux.com/handy-rgb-to-hsl-and-rgb-to-hsv-color-model-c
     */
    Color.prototype.loadHSL = function() {
      var r = this.r / 255;
      var g = this.g / 255;
      var b = this.b / 255;

      var max = Math.max(r, g, b);
      var min = Math.min(r, g, b);

      var h, s, l = (max + min) / 2;

      if (max === min) {
        h = s = 0;  // achromatic
      } else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }

        h /= 6;
      }

      this.h = h;
      this.s = s;
      this.l = l;
    };


    /**
     * Reloads RGB using HSL values
     * Converted from:
     * http://axonflux.com/handy-rgb-to-hsl-and-rgb-to-hsv-color-model-c
     */
    Color.prototype.loadRGB = function() {
      var r, g, b;
      var h = this.h;
      var s = this.s;
      var l = this.l;

      if (s === 0) {
        r = g = b = l;  // achromatic
      } else {
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = this._hue2rgb(p, q, h + 1 / 3);
        g = this._hue2rgb(p, q, h);
        b = this._hue2rgb(p, q, h - 1 / 3);
      }

      this.r = parseInt(r * 255);
      this.g = parseInt(g * 255);
      this.b = parseInt(b * 255);
    };


    /**
     * Helper function to convert hue to rgb
     * Taken from:
     * http://axonflux.com/handy-rgb-to-hsl-and-rgb-to-hsv-color-model-c
     */
    Color.prototype._hue2rgb = function(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    var color = Color;

    function Point(x, y, z) {
      if (this instanceof Point) {
        this.x = (typeof x === 'number') ? x : 0;
        this.y = (typeof y === 'number') ? y : 0;
        this.z = (typeof z === 'number') ? z : 0;
      } else {
        return new Point(x, y, z);
      }
    }


    Point.ORIGIN = new Point(0, 0, 0);


    /**
     * Translate a point from a given dx, dy, and dz
     */
    Point.prototype.translate = function(dx, dy, dz) {

      dx = (typeof dx === 'number') ? dx : 0;
      dy = (typeof dy === 'number') ? dy : 0;
      dz = (typeof dz === 'number') ? dz : 0;

      return new Point(
        this.x + dx,
        this.y + dy,
        this.z + dz);
    };


    /**
     * Scale a point about a given origin
     */
    Point.prototype.scale = function(origin, dx, dy, dz) {
      var p = this.translate(-origin.x, -origin.y, -origin.z);

      if (dy === undefined && dz === undefined) {
        /* If both dy and dz are left out, scale all coordinates equally */
        dy = dz = dx;
        /* If just dz is missing, set it equal to 1 */
      } else {
        dz = (typeof dz === 'number') ? dz : 1;
      }

      p.x *= dx;
      p.y *= dy;
      p.z *= dz;

      return p.translate(origin.x, origin.y, origin.z);
    };

    /**
     * Rotate about origin on the X axis
     */
    Point.prototype.rotateX = function(origin, angle) {
      var p = this.translate(-origin.x, -origin.y, -origin.z);

      var z = p.z * Math.cos(angle) - p.y * Math.sin(angle);
      var y = p.z * Math.sin(angle) + p.y * Math.cos(angle);
      p.z = z;
      p.y = y;

      return p.translate(origin.x, origin.y, origin.z);
    };

    /**
     * Rotate about origin on the Y axis
     */
    Point.prototype.rotateY = function(origin, angle) {
      var p = this.translate(-origin.x, -origin.y, -origin.z);

      var x = p.x * Math.cos(angle) - p.z * Math.sin(angle);
      var z = p.x * Math.sin(angle) + p.z * Math.cos(angle);
      p.x = x;
      p.z = z;

      return p.translate(origin.x, origin.y, origin.z);
    };

    /**
     * Rotate about origin on the Z axis
     */
    Point.prototype.rotateZ = function(origin, angle) {
      var p = this.translate(-origin.x, -origin.y, -origin.z);

      var x = p.x * Math.cos(angle) - p.y * Math.sin(angle);
      var y = p.x * Math.sin(angle) + p.y * Math.cos(angle);
      p.x = x;
      p.y = y;

      return p.translate(origin.x, origin.y, origin.z);
    };


    /**
     * The depth of a point in the isometric plane
     */
    Point.prototype.depth = function() {
      /* z is weighted slightly to accomodate |_ arrangements */
      return this.x + this.y - 2 * this.z;
    };


    /**
     * Distance between two points
     */
    Point.distance = function(p1, p2) {
      var dx = p2.x - p1.x;
      var dy = p2.y - p1.y;
      var dz = p2.z - p1.z;

      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    };


    var point = Point;

    /**
     * Path utility class
     *
     * An Isomer.Path consists of a list of Isomer.Point's
     */
    function Path(points) {
      if (Object.prototype.toString.call(points) === '[object Array]') {
        this.points = points;
      } else {
        this.points = Array.prototype.slice.call(arguments);
      }
    }


    /**
     * Pushes a point onto the end of the path
     */
    Path.prototype.push = function(point) {
      this.points.push(point);
    };


    /**
     * Returns a new path with the points in reverse order
     */
    Path.prototype.reverse = function() {
      var points = Array.prototype.slice.call(this.points);

      return new Path(points.reverse());
    };


    /**
     * Translates a given path
     *
     * Simply a forward to Point#translate
     */
    Path.prototype.translate = function() {
      var args = arguments;

      return new Path(this.points.map(function(point) {
        return point.translate.apply(point, args);
      }));
    };

    /**
     * Returns a new path rotated along the X axis by a given origin
     *
     * Simply a forward to Point#rotateX
     */
    Path.prototype.rotateX = function() {
      var args = arguments;

      return new Path(this.points.map(function(point) {
        return point.rotateX.apply(point, args);
      }));
    };

    /**
     * Returns a new path rotated along the Y axis by a given origin
     *
     * Simply a forward to Point#rotateY
     */
    Path.prototype.rotateY = function() {
      var args = arguments;

      return new Path(this.points.map(function(point) {
        return point.rotateY.apply(point, args);
      }));
    };

    /**
     * Returns a new path rotated along the Z axis by a given origin
     *
     * Simply a forward to Point#rotateZ
     */
    Path.prototype.rotateZ = function() {
      var args = arguments;

      return new Path(this.points.map(function(point) {
        return point.rotateZ.apply(point, args);
      }));
    };


    /**
     * Scales a path about a given origin
     *
     * Simply a forward to Point#scale
     */
    Path.prototype.scale = function() {
      var args = arguments;

      return new Path(this.points.map(function(point) {
        return point.scale.apply(point, args);
      }));
    };


    /**
     * The estimated depth of a path as defined by the average depth
     * of its points
     */
    Path.prototype.depth = function() {
      var i, total = 0;
      for (i = 0; i < this.points.length; i++) {
        total += this.points[i].depth();
      }

      return total / (this.points.length || 1);
    };


    /**
     * Some paths to play with
     */

    /**
     * A rectangle with the bottom-left corner in the origin
     */
    Path.Rectangle = function(origin, width, height) {
      if (width === undefined) width = 1;
      if (height === undefined) height = 1;

      var path = new Path([
        origin,
        new point(origin.x + width, origin.y, origin.z),
        new point(origin.x + width, origin.y + height, origin.z),
        new point(origin.x, origin.y + height, origin.z)
      ]);

      return path;
    };


    /**
     * A circle centered at origin with a given radius and number of vertices
     */
    Path.Circle = function(origin, radius, vertices) {
      vertices = vertices || 20;
      var i, path = new Path();

      for (i = 0; i < vertices; i++) {
        path.push(new point(
          radius * Math.cos(i * 2 * Math.PI / vertices),
          radius * Math.sin(i * 2 * Math.PI / vertices),
          0));
      }

      return path.translate(origin.x, origin.y, origin.z);
    };


    /**
     * A star centered at origin with a given outer radius, inner
     * radius, and number of points
     *
     * Buggy - concave polygons are difficult to draw with our method
     */
    Path.Star = function(origin, outerRadius, innerRadius, points) {
      var i, r, path = new Path();

      for (i = 0; i < points * 2; i++) {
        r = (i % 2 === 0) ? outerRadius : innerRadius;

        path.push(new point(
          r * Math.cos(i * Math.PI / points),
          r * Math.sin(i * Math.PI / points),
          0));
      }

      return path.translate(origin.x, origin.y, origin.z);
    };


    /* Expose the Path constructor */
    var path = Path;

    /**
     * Shape utility class
     *
     * An Isomer.Shape consists of a list of Isomer.Path's
     */
    function Shape(paths) {
      if (Object.prototype.toString.call(paths) === '[object Array]') {
        this.paths = paths;
      } else {
        this.paths = Array.prototype.slice.call(arguments);
      }
    }


    /**
     * Pushes a path onto the end of the Shape
     */
    Shape.prototype.push = function(path) {
      this.paths.push(path);
    };


    /**
     * Translates a given shape
     *
     * Simply a forward to Path#translate
     */
    Shape.prototype.translate = function() {
      var args = arguments;

      return new Shape(this.paths.map(function(path) {
        return path.translate.apply(path, args);
      }));
    };

    /**
     * Rotates a given shape along the X axis around a given origin
     *
     * Simply a forward to Path#rotateX
     */
    Shape.prototype.rotateX = function() {
      var args = arguments;

      return new Shape(this.paths.map(function(path) {
        return path.rotateX.apply(path, args);
      }));
    };

    /**
     * Rotates a given shape along the Y axis around a given origin
     *
     * Simply a forward to Path#rotateY
     */
    Shape.prototype.rotateY = function() {
      var args = arguments;

      return new Shape(this.paths.map(function(path) {
        return path.rotateY.apply(path, args);
      }));
    };

    /**
     * Rotates a given shape along the Z axis around a given origin
     *
     * Simply a forward to Path#rotateZ
     */
    Shape.prototype.rotateZ = function() {
      var args = arguments;

      return new Shape(this.paths.map(function(path) {
        return path.rotateZ.apply(path, args);
      }));
    };

    /**
     * Scales a path about a given origin
     *
     * Simply a forward to Point#scale
     */
    Shape.prototype.scale = function() {
      var args = arguments;

      return new Shape(this.paths.map(function(path) {
        return path.scale.apply(path, args);
      }));
    };


    /**
     * Produces a list of the shape's paths ordered by distance to
     * prevent overlaps when drawing
     */
    Shape.prototype.orderedPaths = function() {
      var paths = this.paths.slice();

      /**
       * Sort the list of faces by distance then map the entries, returning
       * only the path and not the added "further point" from earlier.
       */
      return paths.sort(function(pathA, pathB) {
        return pathB.depth() - pathA.depth();
      });
    };


    /**
     * Utility function to create a 3D object by raising a 2D path
     * along the z-axis
     */
    Shape.extrude = function(path$1, height) {
      height = (typeof height === 'number') ? height : 1;

      var i, topPath = path$1.translate(0, 0, height);
      var shape = new Shape();

      /* Push the top and bottom faces, top face must be oriented correctly */
      shape.push(path$1.reverse());
      shape.push(topPath);

      /* Push each side face */
      for (i = 0; i < path$1.points.length; i++) {
        shape.push(new path([
          topPath.points[i],
          path$1.points[i],
          path$1.points[(i + 1) % path$1.points.length],
          topPath.points[(i + 1) % topPath.points.length]
        ]));
      }

      return shape;
    };


    /**
     * Some shapes to play with
     */

    /**
     * A prism located at origin with dimensions dx, dy, dz
     */
    Shape.Prism = function(origin, dx, dy, dz) {
      dx = (typeof dx === 'number') ? dx : 1;
      dy = (typeof dy === 'number') ? dy : 1;
      dz = (typeof dz === 'number') ? dz : 1;

      /* The shape we will return */
      var prism = new Shape();

      /* Squares parallel to the x-axis */
      var face1 = new path([
        origin,
        new point(origin.x + dx, origin.y, origin.z),
        new point(origin.x + dx, origin.y, origin.z + dz),
        new point(origin.x, origin.y, origin.z + dz)
      ]);

      /* Push this face and its opposite */
      prism.push(face1);
      prism.push(face1.reverse().translate(0, dy, 0));

      /* Square parallel to the y-axis */
      var face2 = new path([
        origin,
        new point(origin.x, origin.y, origin.z + dz),
        new point(origin.x, origin.y + dy, origin.z + dz),
        new point(origin.x, origin.y + dy, origin.z)
      ]);
      prism.push(face2);
      prism.push(face2.reverse().translate(dx, 0, 0));

      /* Square parallel to the xy-plane */
      var face3 = new path([
        origin,
        new point(origin.x + dx, origin.y, origin.z),
        new point(origin.x + dx, origin.y + dy, origin.z),
        new point(origin.x, origin.y + dy, origin.z)
      ]);
      /* This surface is oriented backwards, so we need to reverse the points */
      prism.push(face3.reverse());
      prism.push(face3.translate(0, 0, dz));

      return prism;
    };


    Shape.Pyramid = function(origin, dx, dy, dz) {
      dx = (typeof dx === 'number') ? dx : 1;
      dy = (typeof dy === 'number') ? dy : 1;
      dz = (typeof dz === 'number') ? dz : 1;

      var pyramid = new Shape();

      /* Path parallel to the x-axis */
      var face1 = new path([
        origin,
        new point(origin.x + dx, origin.y, origin.z),
        new point(origin.x + dx / 2, origin.y + dy / 2, origin.z + dz)
      ]);
      /* Push the face, and its opposite face, by rotating around the Z-axis */
      pyramid.push(face1);
      pyramid.push(face1.rotateZ(origin.translate(dx / 2, dy / 2), Math.PI));

      /* Path parallel to the y-axis */
      var face2 = new path([
        origin,
        new point(origin.x + dx / 2, origin.y + dy / 2, origin.z + dz),
        new point(origin.x, origin.y + dy, origin.z)
      ]);
      pyramid.push(face2);
      pyramid.push(face2.rotateZ(origin.translate(dx / 2, dy / 2), Math.PI));

      return pyramid;
    };


    Shape.Cylinder = function(origin, radius, vertices, height) {
      radius = (typeof radius === 'number') ? radius : 1;

      var circle = path.Circle(origin, radius, vertices);
      var cylinder = Shape.extrude(circle, height);

      return cylinder;
    };


    var shape = Shape;

    function Vector (i, j, k) {
      this.i = (typeof i === 'number') ? i : 0;
      this.j = (typeof j === 'number') ? j : 0;
      this.k = (typeof k === 'number') ? k : 0;
    }

    /**
     * Alternate constructor
     */
    Vector.fromTwoPoints = function(p1, p2) {
      return new Vector(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z);
    };

    Vector.crossProduct = function(v1, v2) {
      var i = v1.j * v2.k - v2.j * v1.k;
      var j = -1 * (v1.i * v2.k - v2.i * v1.k);
      var k = v1.i * v2.j - v2.i * v1.j;

      return new Vector(i, j, k);
    };

    Vector.dotProduct = function(v1, v2) {
      return v1.i * v2.i + v1.j * v2.j + v1.k * v2.k;
    };

    Vector.prototype.magnitude = function() {
      return Math.sqrt(this.i * this.i + this.j * this.j + this.k * this.k);
    };

    Vector.prototype.normalize = function() {
      var magnitude = this.magnitude();
      /**
       * If the magnitude is 0 then return the zero vector instead of dividing by 0
       */
      if (magnitude === 0) {
        return new Vector(0, 0, 0);
      }
      return new Vector(this.i / magnitude, this.j / magnitude, this.k / magnitude);
    };

    var vector = Vector;

    /**
     * The Isomer class
     *
     * This file contains the Isomer base definition
     */
    function Isomer(canvasId, options) {
      options = options || {};

      this.canvas = new canvas(canvasId);
      this.angle = Math.PI / 6;

      this.scale = options.scale || 70;

      this._calculateTransformation();

      this.originX = options.originX || this.canvas.width / 2;
      this.originY = options.originY || this.canvas.height * 0.9;

      /**
       * Light source as defined as the angle from
       * the object to the source.
       *
       * We'll define somewhat arbitrarily for now.
       */
      this.lightPosition = options.lightPosition || new vector(2, -1, 3);
      this.lightAngle = this.lightPosition.normalize();

      /**
       * The maximum color difference from shading
       */
      this.colorDifference = 0.20;
      this.lightColor = options.lightColor || new color(255, 255, 255);
    }

    /**
     * Sets the light position for drawing.
     */
    Isomer.prototype.setLightPosition = function(x, y, z) {
      this.lightPosition = new vector(x, y, z);
      this.lightAngle = this.lightPosition.normalize();
    };

    Isomer.prototype._translatePoint = function(point$1) {
      /**
       * X rides along the angle extended from the origin
       * Y rides perpendicular to this angle (in isometric view: PI - angle)
       * Z affects the y coordinate of the drawn point
       */
      var xMap = new point(point$1.x * this.transformation[0][0],
                           point$1.x * this.transformation[0][1]);

      var yMap = new point(point$1.y * this.transformation[1][0],
                           point$1.y * this.transformation[1][1]);

      var x = this.originX + xMap.x + yMap.x;
      var y = this.originY - xMap.y - yMap.y - (point$1.z * this.scale);
      return new point(x, y);
    };


    /**
     * Adds a shape or path to the scene
     *
     * This method also accepts arrays
     */
    Isomer.prototype.add = function(item, baseColor) {
      if (Object.prototype.toString.call(item) == '[object Array]') {
        for (var i = 0; i < item.length; i++) {
          this.add(item[i], baseColor);
        }
      } else if (item instanceof path) {
        this._addPath(item, baseColor);
      } else if (item instanceof shape) {
        /* Fetch paths ordered by distance to prevent overlaps */
        var paths = item.orderedPaths();

        for (var j = 0; j < paths.length; j++) {
          this._addPath(paths[j], baseColor);
        }
      }
    };


    /**
     * Adds a path to the scene
     */
    Isomer.prototype._addPath = function(path, baseColor) {
      /* Default baseColor */
      baseColor = baseColor || new color(120, 120, 120);

      /* Compute color */
      var v1 = vector.fromTwoPoints(path.points[1], path.points[0]);
      var v2 = vector.fromTwoPoints(path.points[2], path.points[1]);

      var normal = vector.crossProduct(v1, v2).normalize();

      /**
       * Brightness is between -1 and 1 and is computed based
       * on the dot product between the light source vector and normal.
       */
      var brightness = vector.dotProduct(normal, this.lightAngle);
      var color$1 = baseColor.lighten(brightness * this.colorDifference, this.lightColor);

      this.canvas.path(path.points.map(this._translatePoint.bind(this)), color$1);
    };

    /**
     * Precalculates transformation values based on the current angle and scale
     * which in theory reduces costly cos and sin calls
     */
    Isomer.prototype._calculateTransformation = function() {
      this.transformation = [
        [
          this.scale * Math.cos(this.angle),
          this.scale * Math.sin(this.angle)
        ],
        [
          this.scale * Math.cos(Math.PI - this.angle),
          this.scale * Math.sin(Math.PI - this.angle)
        ]
      ];
    };

    /* Namespace our primitives */
    Isomer.Canvas = canvas;
    Isomer.Color = color;
    Isomer.Path = path;
    Isomer.Point = point;
    Isomer.Shape = shape;
    Isomer.Vector = vector;

    /* Expose Isomer API */
    var isomer = Isomer;

    /**
     * Entry point for the Isomer API
     */
    var isomer$1 = isomer;

    function createCommonjsModule(fn, basedir, module) {
    	return module = {
    	  path: basedir,
    	  exports: {},
    	  require: function (path, base) {
          return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
        }
    	}, fn(module, module.exports), module.exports;
    }

    function commonjsRequire () {
    	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
    }

    var collectionUtils = createCommonjsModule(function (module) {

    var utils = module.exports = {};

    /**
     * Loops through the collection and calls the callback for each element. if the callback returns truthy, the loop is broken and returns the same value.
     * @public
     * @param {*} collection The collection to loop through. Needs to have a length property set and have indices set from 0 to length - 1.
     * @param {function} callback The callback to be called for each element. The element will be given as a parameter to the callback. If this callback returns truthy, the loop is broken and the same value is returned.
     * @returns {*} The value that a callback has returned (if truthy). Otherwise nothing.
     */
    utils.forEach = function(collection, callback) {
        for(var i = 0; i < collection.length; i++) {
            var result = callback(collection[i]);
            if(result) {
                return result;
            }
        }
    };
    });

    var elementUtils = function(options) {
        var getState = options.stateHandler.getState;

        /**
         * Tells if the element has been made detectable and ready to be listened for resize events.
         * @public
         * @param {element} The element to check.
         * @returns {boolean} True or false depending on if the element is detectable or not.
         */
        function isDetectable(element) {
            var state = getState(element);
            return state && !!state.isDetectable;
        }

        /**
         * Marks the element that it has been made detectable and ready to be listened for resize events.
         * @public
         * @param {element} The element to mark.
         */
        function markAsDetectable(element) {
            getState(element).isDetectable = true;
        }

        /**
         * Tells if the element is busy or not.
         * @public
         * @param {element} The element to check.
         * @returns {boolean} True or false depending on if the element is busy or not.
         */
        function isBusy(element) {
            return !!getState(element).busy;
        }

        /**
         * Marks the object is busy and should not be made detectable.
         * @public
         * @param {element} element The element to mark.
         * @param {boolean} busy If the element is busy or not.
         */
        function markBusy(element, busy) {
            getState(element).busy = !!busy;
        }

        return {
            isDetectable: isDetectable,
            markAsDetectable: markAsDetectable,
            isBusy: isBusy,
            markBusy: markBusy
        };
    };

    var listenerHandler = function(idHandler) {
        var eventListeners = {};

        /**
         * Gets all listeners for the given element.
         * @public
         * @param {element} element The element to get all listeners for.
         * @returns All listeners for the given element.
         */
        function getListeners(element) {
            var id = idHandler.get(element);

            if (id === undefined) {
                return [];
            }

            return eventListeners[id] || [];
        }

        /**
         * Stores the given listener for the given element. Will not actually add the listener to the element.
         * @public
         * @param {element} element The element that should have the listener added.
         * @param {function} listener The callback that the element has added.
         */
        function addListener(element, listener) {
            var id = idHandler.get(element);

            if(!eventListeners[id]) {
                eventListeners[id] = [];
            }

            eventListeners[id].push(listener);
        }

        function removeListener(element, listener) {
            var listeners = getListeners(element);
            for (var i = 0, len = listeners.length; i < len; ++i) {
                if (listeners[i] === listener) {
                  listeners.splice(i, 1);
                  break;
                }
            }
        }

        function removeAllListeners(element) {
          var listeners = getListeners(element);
          if (!listeners) { return; }
          listeners.length = 0;
        }

        return {
            get: getListeners,
            add: addListener,
            removeListener: removeListener,
            removeAllListeners: removeAllListeners
        };
    };

    var idGenerator = function() {
        var idCount = 1;

        /**
         * Generates a new unique id in the context.
         * @public
         * @returns {number} A unique id in the context.
         */
        function generate() {
            return idCount++;
        }

        return {
            generate: generate
        };
    };

    var idHandler = function(options) {
        var idGenerator     = options.idGenerator;
        var getState        = options.stateHandler.getState;

        /**
         * Gets the resize detector id of the element.
         * @public
         * @param {element} element The target element to get the id of.
         * @returns {string|number|null} The id of the element. Null if it has no id.
         */
        function getId(element) {
            var state = getState(element);

            if (state && state.id !== undefined) {
                return state.id;
            }

            return null;
        }

        /**
         * Sets the resize detector id of the element. Requires the element to have a resize detector state initialized.
         * @public
         * @param {element} element The target element to set the id of.
         * @returns {string|number|null} The id of the element.
         */
        function setId(element) {
            var state = getState(element);

            if (!state) {
                throw new Error("setId required the element to have a resize detection state.");
            }

            var id = idGenerator.generate();

            state.id = id;

            return id;
        }

        return {
            get: getId,
            set: setId
        };
    };

    /* global console: false */

    /**
     * Reporter that handles the reporting of logs, warnings and errors.
     * @public
     * @param {boolean} quiet Tells if the reporter should be quiet or not.
     */
    var reporter = function(quiet) {
        function noop() {
            //Does nothing.
        }

        var reporter = {
            log: noop,
            warn: noop,
            error: noop
        };

        if(!quiet && window.console) {
            var attachFunction = function(reporter, name) {
                //The proxy is needed to be able to call the method with the console context,
                //since we cannot use bind.
                reporter[name] = function reporterProxy() {
                    var f = console[name];
                    if (f.apply) { //IE9 does not support console.log.apply :)
                        f.apply(console, arguments);
                    } else {
                        for (var i = 0; i < arguments.length; i++) {
                            f(arguments[i]);
                        }
                    }
                };
            };

            attachFunction(reporter, "log");
            attachFunction(reporter, "warn");
            attachFunction(reporter, "error");
        }

        return reporter;
    };

    var browserDetector = createCommonjsModule(function (module) {

    var detector = module.exports = {};

    detector.isIE = function(version) {
        function isAnyIeVersion() {
            var agent = navigator.userAgent.toLowerCase();
            return agent.indexOf("msie") !== -1 || agent.indexOf("trident") !== -1 || agent.indexOf(" edge/") !== -1;
        }

        if(!isAnyIeVersion()) {
            return false;
        }

        if(!version) {
            return true;
        }

        //Shamelessly stolen from https://gist.github.com/padolsey/527683
        var ieVersion = (function(){
            var undef,
                v = 3,
                div = document.createElement("div"),
                all = div.getElementsByTagName("i");

            do {
                div.innerHTML = "<!--[if gt IE " + (++v) + "]><i></i><![endif]-->";
            }
            while (all[0]);

            return v > 4 ? v : undef;
        }());

        return version === ieVersion;
    };

    detector.isLegacyOpera = function() {
        return !!window.opera;
    };
    });

    var utils_1 = createCommonjsModule(function (module) {

    var utils = module.exports = {};

    utils.getOption = getOption;

    function getOption(options, name, defaultValue) {
        var value = options[name];

        if((value === undefined || value === null) && defaultValue !== undefined) {
            return defaultValue;
        }

        return value;
    }
    });

    var batchProcessor = function batchProcessorMaker(options) {
        options             = options || {};
        var reporter        = options.reporter;
        var asyncProcess    = utils_1.getOption(options, "async", true);
        var autoProcess     = utils_1.getOption(options, "auto", true);

        if(autoProcess && !asyncProcess) {
            reporter && reporter.warn("Invalid options combination. auto=true and async=false is invalid. Setting async=true.");
            asyncProcess = true;
        }

        var batch = Batch();
        var asyncFrameHandler;
        var isProcessing = false;

        function addFunction(level, fn) {
            if(!isProcessing && autoProcess && asyncProcess && batch.size() === 0) {
                // Since this is async, it is guaranteed to be executed after that the fn is added to the batch.
                // This needs to be done before, since we're checking the size of the batch to be 0.
                processBatchAsync();
            }

            batch.add(level, fn);
        }

        function processBatch() {
            // Save the current batch, and create a new batch so that incoming functions are not added into the currently processing batch.
            // Continue processing until the top-level batch is empty (functions may be added to the new batch while processing, and so on).
            isProcessing = true;
            while (batch.size()) {
                var processingBatch = batch;
                batch = Batch();
                processingBatch.process();
            }
            isProcessing = false;
        }

        function forceProcessBatch(localAsyncProcess) {
            if (isProcessing) {
                return;
            }

            if(localAsyncProcess === undefined) {
                localAsyncProcess = asyncProcess;
            }

            if(asyncFrameHandler) {
                cancelFrame(asyncFrameHandler);
                asyncFrameHandler = null;
            }

            if(localAsyncProcess) {
                processBatchAsync();
            } else {
                processBatch();
            }
        }

        function processBatchAsync() {
            asyncFrameHandler = requestFrame(processBatch);
        }

        function cancelFrame(listener) {
            // var cancel = window.cancelAnimationFrame || window.mozCancelAnimationFrame || window.webkitCancelAnimationFrame || window.clearTimeout;
            var cancel = clearTimeout;
            return cancel(listener);
        }

        function requestFrame(callback) {
            // var raf = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || function(fn) { return window.setTimeout(fn, 20); };
            var raf = function(fn) { return setTimeout(fn, 0); };
            return raf(callback);
        }

        return {
            add: addFunction,
            force: forceProcessBatch
        };
    };

    function Batch() {
        var batch       = {};
        var size        = 0;
        var topLevel    = 0;
        var bottomLevel = 0;

        function add(level, fn) {
            if(!fn) {
                fn = level;
                level = 0;
            }

            if(level > topLevel) {
                topLevel = level;
            } else if(level < bottomLevel) {
                bottomLevel = level;
            }

            if(!batch[level]) {
                batch[level] = [];
            }

            batch[level].push(fn);
            size++;
        }

        function process() {
            for(var level = bottomLevel; level <= topLevel; level++) {
                var fns = batch[level];

                for(var i = 0; i < fns.length; i++) {
                    var fn = fns[i];
                    fn();
                }
            }
        }

        function getSize() {
            return size;
        }

        return {
            add: add,
            process: process,
            size: getSize
        };
    }

    var prop = "_erd";

    function initState(element) {
        element[prop] = {};
        return getState(element);
    }

    function getState(element) {
        return element[prop];
    }

    function cleanState(element) {
        delete element[prop];
    }

    var stateHandler = {
        initState: initState,
        getState: getState,
        cleanState: cleanState
    };

    var object = function(options) {
        options             = options || {};
        var reporter        = options.reporter;
        var batchProcessor  = options.batchProcessor;
        var getState        = options.stateHandler.getState;

        if(!reporter) {
            throw new Error("Missing required dependency: reporter.");
        }

        /**
         * Adds a resize event listener to the element.
         * @public
         * @param {element} element The element that should have the listener added.
         * @param {function} listener The listener callback to be called for each resize event of the element. The element will be given as a parameter to the listener callback.
         */
        function addListener(element, listener) {
            function listenerProxy() {
                listener(element);
            }

            if(browserDetector.isIE(8)) {
                //IE 8 does not support object, but supports the resize event directly on elements.
                getState(element).object = {
                    proxy: listenerProxy
                };
                element.attachEvent("onresize", listenerProxy);
            } else {
                var object = getObject(element);

                if(!object) {
                    throw new Error("Element is not detectable by this strategy.");
                }

                object.contentDocument.defaultView.addEventListener("resize", listenerProxy);
            }
        }

        function buildCssTextString(rules) {
            var seperator = options.important ? " !important; " : "; ";

            return (rules.join(seperator) + seperator).trim();
        }

        /**
         * Makes an element detectable and ready to be listened for resize events. Will call the callback when the element is ready to be listened for resize changes.
         * @private
         * @param {object} options Optional options object.
         * @param {element} element The element to make detectable
         * @param {function} callback The callback to be called when the element is ready to be listened for resize changes. Will be called with the element as first parameter.
         */
        function makeDetectable(options, element, callback) {
            if (!callback) {
                callback = element;
                element = options;
                options = null;
            }

            options = options || {};
            var debug = options.debug;

            function injectObject(element, callback) {
                var OBJECT_STYLE = buildCssTextString(["display: block", "position: absolute", "top: 0", "left: 0", "width: 100%", "height: 100%", "border: none", "padding: 0", "margin: 0", "opacity: 0", "z-index: -1000", "pointer-events: none"]);

                //The target element needs to be positioned (everything except static) so the absolute positioned object will be positioned relative to the target element.

                // Position altering may be performed directly or on object load, depending on if style resolution is possible directly or not.
                var positionCheckPerformed = false;

                // The element may not yet be attached to the DOM, and therefore the style object may be empty in some browsers.
                // Since the style object is a reference, it will be updated as soon as the element is attached to the DOM.
                var style = window.getComputedStyle(element);
                var width = element.offsetWidth;
                var height = element.offsetHeight;

                getState(element).startSize = {
                    width: width,
                    height: height
                };

                function mutateDom() {
                    function alterPositionStyles() {
                        if(style.position === "static") {
                            element.style.setProperty("position", "relative", options.important ? "important" : "");

                            var removeRelativeStyles = function(reporter, element, style, property) {
                                function getNumericalValue(value) {
                                    return value.replace(/[^-\d\.]/g, "");
                                }

                                var value = style[property];

                                if(value !== "auto" && getNumericalValue(value) !== "0") {
                                    reporter.warn("An element that is positioned static has style." + property + "=" + value + " which is ignored due to the static positioning. The element will need to be positioned relative, so the style." + property + " will be set to 0. Element: ", element);
                                    element.style.setProperty(property, "0", options.important ? "important" : "");
                                }
                            };

                            //Check so that there are no accidental styles that will make the element styled differently now that is is relative.
                            //If there are any, set them to 0 (this should be okay with the user since the style properties did nothing before [since the element was positioned static] anyway).
                            removeRelativeStyles(reporter, element, style, "top");
                            removeRelativeStyles(reporter, element, style, "right");
                            removeRelativeStyles(reporter, element, style, "bottom");
                            removeRelativeStyles(reporter, element, style, "left");
                        }
                    }

                    function onObjectLoad() {
                        // The object has been loaded, which means that the element now is guaranteed to be attached to the DOM.
                        if (!positionCheckPerformed) {
                            alterPositionStyles();
                        }

                        /*jshint validthis: true */

                        function getDocument(element, callback) {
                            //Opera 12 seem to call the object.onload before the actual document has been created.
                            //So if it is not present, poll it with an timeout until it is present.
                            //TODO: Could maybe be handled better with object.onreadystatechange or similar.
                            if(!element.contentDocument) {
                                var state = getState(element);
                                if (state.checkForObjectDocumentTimeoutId) {
                                    window.clearTimeout(state.checkForObjectDocumentTimeoutId);
                                }
                                state.checkForObjectDocumentTimeoutId = setTimeout(function checkForObjectDocument() {
                                    state.checkForObjectDocumentTimeoutId = 0;
                                    getDocument(element, callback);
                                }, 100);

                                return;
                            }

                            callback(element.contentDocument);
                        }

                        //Mutating the object element here seems to fire another load event.
                        //Mutating the inner document of the object element is fine though.
                        var objectElement = this;

                        //Create the style element to be added to the object.
                        getDocument(objectElement, function onObjectDocumentReady(objectDocument) {
                            //Notify that the element is ready to be listened to.
                            callback(element);
                        });
                    }

                    // The element may be detached from the DOM, and some browsers does not support style resolving of detached elements.
                    // The alterPositionStyles needs to be delayed until we know the element has been attached to the DOM (which we are sure of when the onObjectLoad has been fired), if style resolution is not possible.
                    if (style.position !== "") {
                        alterPositionStyles();
                        positionCheckPerformed = true;
                    }

                    //Add an object element as a child to the target element that will be listened to for resize events.
                    var object = document.createElement("object");
                    object.style.cssText = OBJECT_STYLE;
                    object.tabIndex = -1;
                    object.type = "text/html";
                    object.setAttribute("aria-hidden", "true");
                    object.onload = onObjectLoad;

                    //Safari: This must occur before adding the object to the DOM.
                    //IE: Does not like that this happens before, even if it is also added after.
                    if(!browserDetector.isIE()) {
                        object.data = "about:blank";
                    }

                    if (!getState(element)) {
                        // The element has been uninstalled before the actual loading happened.
                        return;
                    }

                    element.appendChild(object);
                    getState(element).object = object;

                    //IE: This must occur after adding the object to the DOM.
                    if(browserDetector.isIE()) {
                        object.data = "about:blank";
                    }
                }

                if(batchProcessor) {
                    batchProcessor.add(mutateDom);
                } else {
                    mutateDom();
                }
            }

            if(browserDetector.isIE(8)) {
                //IE 8 does not support objects properly. Luckily they do support the resize event.
                //So do not inject the object and notify that the element is already ready to be listened to.
                //The event handler for the resize event is attached in the utils.addListener instead.
                callback(element);
            } else {
                injectObject(element, callback);
            }
        }

        /**
         * Returns the child object of the target element.
         * @private
         * @param {element} element The target element.
         * @returns The object element of the target.
         */
        function getObject(element) {
            return getState(element).object;
        }

        function uninstall(element) {
            if (!getState(element)) {
                return;
            }

            var object = getObject(element);

            if (!object) {
                return;
            }

            if (browserDetector.isIE(8)) {
                element.detachEvent("onresize", object.proxy);
            } else {
                element.removeChild(object);
            }

            if (getState(element).checkForObjectDocumentTimeoutId) {
                window.clearTimeout(getState(element).checkForObjectDocumentTimeoutId);
            }

            delete getState(element).object;
        }

        return {
            makeDetectable: makeDetectable,
            addListener: addListener,
            uninstall: uninstall
        };
    };

    var forEach = collectionUtils.forEach;

    var scroll = function(options) {
        options             = options || {};
        var reporter        = options.reporter;
        var batchProcessor  = options.batchProcessor;
        var getState        = options.stateHandler.getState;
        var hasState        = options.stateHandler.hasState;
        var idHandler       = options.idHandler;

        if (!batchProcessor) {
            throw new Error("Missing required dependency: batchProcessor");
        }

        if (!reporter) {
            throw new Error("Missing required dependency: reporter.");
        }

        //TODO: Could this perhaps be done at installation time?
        var scrollbarSizes = getScrollbarSizes();

        var styleId = "erd_scroll_detection_scrollbar_style";
        var detectionContainerClass = "erd_scroll_detection_container";

        function initDocument(targetDocument) {
            // Inject the scrollbar styling that prevents them from appearing sometimes in Chrome.
            // The injected container needs to have a class, so that it may be styled with CSS (pseudo elements).
            injectScrollStyle(targetDocument, styleId, detectionContainerClass);
        }

        initDocument(window.document);

        function buildCssTextString(rules) {
            var seperator = options.important ? " !important; " : "; ";

            return (rules.join(seperator) + seperator).trim();
        }

        function getScrollbarSizes() {
            var width = 500;
            var height = 500;

            var child = document.createElement("div");
            child.style.cssText = buildCssTextString(["position: absolute", "width: " + width*2 + "px", "height: " + height*2 + "px", "visibility: hidden", "margin: 0", "padding: 0"]);

            var container = document.createElement("div");
            container.style.cssText = buildCssTextString(["position: absolute", "width: " + width + "px", "height: " + height + "px", "overflow: scroll", "visibility: none", "top: " + -width*3 + "px", "left: " + -height*3 + "px", "visibility: hidden", "margin: 0", "padding: 0"]);

            container.appendChild(child);

            document.body.insertBefore(container, document.body.firstChild);

            var widthSize = width - container.clientWidth;
            var heightSize = height - container.clientHeight;

            document.body.removeChild(container);

            return {
                width: widthSize,
                height: heightSize
            };
        }

        function injectScrollStyle(targetDocument, styleId, containerClass) {
            function injectStyle(style, method) {
                method = method || function (element) {
                    targetDocument.head.appendChild(element);
                };

                var styleElement = targetDocument.createElement("style");
                styleElement.innerHTML = style;
                styleElement.id = styleId;
                method(styleElement);
                return styleElement;
            }

            if (!targetDocument.getElementById(styleId)) {
                var containerAnimationClass = containerClass + "_animation";
                var containerAnimationActiveClass = containerClass + "_animation_active";
                var style = "/* Created by the element-resize-detector library. */\n";
                style += "." + containerClass + " > div::-webkit-scrollbar { " + buildCssTextString(["display: none"]) + " }\n\n";
                style += "." + containerAnimationActiveClass + " { " + buildCssTextString(["-webkit-animation-duration: 0.1s", "animation-duration: 0.1s", "-webkit-animation-name: " + containerAnimationClass, "animation-name: " + containerAnimationClass]) + " }\n";
                style += "@-webkit-keyframes " + containerAnimationClass +  " { 0% { opacity: 1; } 50% { opacity: 0; } 100% { opacity: 1; } }\n";
                style += "@keyframes " + containerAnimationClass +          " { 0% { opacity: 1; } 50% { opacity: 0; } 100% { opacity: 1; } }";
                injectStyle(style);
            }
        }

        function addAnimationClass(element) {
            element.className += " " + detectionContainerClass + "_animation_active";
        }

        function addEvent(el, name, cb) {
            if (el.addEventListener) {
                el.addEventListener(name, cb);
            } else if(el.attachEvent) {
                el.attachEvent("on" + name, cb);
            } else {
                return reporter.error("[scroll] Don't know how to add event listeners.");
            }
        }

        function removeEvent(el, name, cb) {
            if (el.removeEventListener) {
                el.removeEventListener(name, cb);
            } else if(el.detachEvent) {
                el.detachEvent("on" + name, cb);
            } else {
                return reporter.error("[scroll] Don't know how to remove event listeners.");
            }
        }

        function getExpandElement(element) {
            return getState(element).container.childNodes[0].childNodes[0].childNodes[0];
        }

        function getShrinkElement(element) {
            return getState(element).container.childNodes[0].childNodes[0].childNodes[1];
        }

        /**
         * Adds a resize event listener to the element.
         * @public
         * @param {element} element The element that should have the listener added.
         * @param {function} listener The listener callback to be called for each resize event of the element. The element will be given as a parameter to the listener callback.
         */
        function addListener(element, listener) {
            var listeners = getState(element).listeners;

            if (!listeners.push) {
                throw new Error("Cannot add listener to an element that is not detectable.");
            }

            getState(element).listeners.push(listener);
        }

        /**
         * Makes an element detectable and ready to be listened for resize events. Will call the callback when the element is ready to be listened for resize changes.
         * @private
         * @param {object} options Optional options object.
         * @param {element} element The element to make detectable
         * @param {function} callback The callback to be called when the element is ready to be listened for resize changes. Will be called with the element as first parameter.
         */
        function makeDetectable(options, element, callback) {
            if (!callback) {
                callback = element;
                element = options;
                options = null;
            }

            options = options || {};

            function debug() {
                if (options.debug) {
                    var args = Array.prototype.slice.call(arguments);
                    args.unshift(idHandler.get(element), "Scroll: ");
                    if (reporter.log.apply) {
                        reporter.log.apply(null, args);
                    } else {
                        for (var i = 0; i < args.length; i++) {
                            reporter.log(args[i]);
                        }
                    }
                }
            }

            function isDetached(element) {
                function isInDocument(element) {
                    return element === element.ownerDocument.body || element.ownerDocument.body.contains(element);
                }

                if (!isInDocument(element)) {
                    return true;
                }

                // FireFox returns null style in hidden iframes. See https://github.com/wnr/element-resize-detector/issues/68 and https://bugzilla.mozilla.org/show_bug.cgi?id=795520
                if (window.getComputedStyle(element) === null) {
                    return true;
                }

                return false;
            }

            function isUnrendered(element) {
                // Check the absolute positioned container since the top level container is display: inline.
                var container = getState(element).container.childNodes[0];
                var style = window.getComputedStyle(container);
                return !style.width || style.width.indexOf("px") === -1; //Can only compute pixel value when rendered.
            }

            function getStyle() {
                // Some browsers only force layouts when actually reading the style properties of the style object, so make sure that they are all read here,
                // so that the user of the function can be sure that it will perform the layout here, instead of later (important for batching).
                var elementStyle            = window.getComputedStyle(element);
                var style                   = {};
                style.position              = elementStyle.position;
                style.width                 = element.offsetWidth;
                style.height                = element.offsetHeight;
                style.top                   = elementStyle.top;
                style.right                 = elementStyle.right;
                style.bottom                = elementStyle.bottom;
                style.left                  = elementStyle.left;
                style.widthCSS              = elementStyle.width;
                style.heightCSS             = elementStyle.height;
                return style;
            }

            function storeStartSize() {
                var style = getStyle();
                getState(element).startSize = {
                    width: style.width,
                    height: style.height
                };
                debug("Element start size", getState(element).startSize);
            }

            function initListeners() {
                getState(element).listeners = [];
            }

            function storeStyle() {
                debug("storeStyle invoked.");
                if (!getState(element)) {
                    debug("Aborting because element has been uninstalled");
                    return;
                }

                var style = getStyle();
                getState(element).style = style;
            }

            function storeCurrentSize(element, width, height) {
                getState(element).lastWidth = width;
                getState(element).lastHeight  = height;
            }

            function getExpandChildElement(element) {
                return getExpandElement(element).childNodes[0];
            }

            function getWidthOffset() {
                return 2 * scrollbarSizes.width + 1;
            }

            function getHeightOffset() {
                return 2 * scrollbarSizes.height + 1;
            }

            function getExpandWidth(width) {
                return width + 10 + getWidthOffset();
            }

            function getExpandHeight(height) {
                return height + 10 + getHeightOffset();
            }

            function getShrinkWidth(width) {
                return width * 2 + getWidthOffset();
            }

            function getShrinkHeight(height) {
                return height * 2 + getHeightOffset();
            }

            function positionScrollbars(element, width, height) {
                var expand          = getExpandElement(element);
                var shrink          = getShrinkElement(element);
                var expandWidth     = getExpandWidth(width);
                var expandHeight    = getExpandHeight(height);
                var shrinkWidth     = getShrinkWidth(width);
                var shrinkHeight    = getShrinkHeight(height);
                expand.scrollLeft   = expandWidth;
                expand.scrollTop    = expandHeight;
                shrink.scrollLeft   = shrinkWidth;
                shrink.scrollTop    = shrinkHeight;
            }

            function injectContainerElement() {
                var container = getState(element).container;

                if (!container) {
                    container                   = document.createElement("div");
                    container.className         = detectionContainerClass;
                    container.style.cssText     = buildCssTextString(["visibility: hidden", "display: inline", "width: 0px", "height: 0px", "z-index: -1", "overflow: hidden", "margin: 0", "padding: 0"]);
                    getState(element).container = container;
                    addAnimationClass(container);
                    element.appendChild(container);

                    var onAnimationStart = function () {
                        getState(element).onRendered && getState(element).onRendered();
                    };

                    addEvent(container, "animationstart", onAnimationStart);

                    // Store the event handler here so that they may be removed when uninstall is called.
                    // See uninstall function for an explanation why it is needed.
                    getState(element).onAnimationStart = onAnimationStart;
                }

                return container;
            }

            function injectScrollElements() {
                function alterPositionStyles() {
                    var style = getState(element).style;

                    if(style.position === "static") {
                        element.style.setProperty("position", "relative",options.important ? "important" : "");

                        var removeRelativeStyles = function(reporter, element, style, property) {
                            function getNumericalValue(value) {
                                return value.replace(/[^-\d\.]/g, "");
                            }

                            var value = style[property];

                            if(value !== "auto" && getNumericalValue(value) !== "0") {
                                reporter.warn("An element that is positioned static has style." + property + "=" + value + " which is ignored due to the static positioning. The element will need to be positioned relative, so the style." + property + " will be set to 0. Element: ", element);
                                element.style[property] = 0;
                            }
                        };

                        //Check so that there are no accidental styles that will make the element styled differently now that is is relative.
                        //If there are any, set them to 0 (this should be okay with the user since the style properties did nothing before [since the element was positioned static] anyway).
                        removeRelativeStyles(reporter, element, style, "top");
                        removeRelativeStyles(reporter, element, style, "right");
                        removeRelativeStyles(reporter, element, style, "bottom");
                        removeRelativeStyles(reporter, element, style, "left");
                    }
                }

                function getLeftTopBottomRightCssText(left, top, bottom, right) {
                    left = (!left ? "0" : (left + "px"));
                    top = (!top ? "0" : (top + "px"));
                    bottom = (!bottom ? "0" : (bottom + "px"));
                    right = (!right ? "0" : (right + "px"));

                    return ["left: " + left, "top: " + top, "right: " + right, "bottom: " + bottom];
                }

                debug("Injecting elements");

                if (!getState(element)) {
                    debug("Aborting because element has been uninstalled");
                    return;
                }

                alterPositionStyles();

                var rootContainer = getState(element).container;

                if (!rootContainer) {
                    rootContainer = injectContainerElement();
                }

                // Due to this WebKit bug https://bugs.webkit.org/show_bug.cgi?id=80808 (currently fixed in Blink, but still present in WebKit browsers such as Safari),
                // we need to inject two containers, one that is width/height 100% and another that is left/top -1px so that the final container always is 1x1 pixels bigger than
                // the targeted element.
                // When the bug is resolved, "containerContainer" may be removed.

                // The outer container can occasionally be less wide than the targeted when inside inline elements element in WebKit (see https://bugs.webkit.org/show_bug.cgi?id=152980).
                // This should be no problem since the inner container either way makes sure the injected scroll elements are at least 1x1 px.

                var scrollbarWidth          = scrollbarSizes.width;
                var scrollbarHeight         = scrollbarSizes.height;
                var containerContainerStyle = buildCssTextString(["position: absolute", "flex: none", "overflow: hidden", "z-index: -1", "visibility: hidden", "width: 100%", "height: 100%", "left: 0px", "top: 0px"]);
                var containerStyle          = buildCssTextString(["position: absolute", "flex: none", "overflow: hidden", "z-index: -1", "visibility: hidden"].concat(getLeftTopBottomRightCssText(-(1 + scrollbarWidth), -(1 + scrollbarHeight), -scrollbarHeight, -scrollbarWidth)));
                var expandStyle             = buildCssTextString(["position: absolute", "flex: none", "overflow: scroll", "z-index: -1", "visibility: hidden", "width: 100%", "height: 100%"]);
                var shrinkStyle             = buildCssTextString(["position: absolute", "flex: none", "overflow: scroll", "z-index: -1", "visibility: hidden", "width: 100%", "height: 100%"]);
                var expandChildStyle        = buildCssTextString(["position: absolute", "left: 0", "top: 0"]);
                var shrinkChildStyle        = buildCssTextString(["position: absolute", "width: 200%", "height: 200%"]);

                var containerContainer      = document.createElement("div");
                var container               = document.createElement("div");
                var expand                  = document.createElement("div");
                var expandChild             = document.createElement("div");
                var shrink                  = document.createElement("div");
                var shrinkChild             = document.createElement("div");

                // Some browsers choke on the resize system being rtl, so force it to ltr. https://github.com/wnr/element-resize-detector/issues/56
                // However, dir should not be set on the top level container as it alters the dimensions of the target element in some browsers.
                containerContainer.dir              = "ltr";

                containerContainer.style.cssText    = containerContainerStyle;
                containerContainer.className        = detectionContainerClass;
                container.className                 = detectionContainerClass;
                container.style.cssText             = containerStyle;
                expand.style.cssText                = expandStyle;
                expandChild.style.cssText           = expandChildStyle;
                shrink.style.cssText                = shrinkStyle;
                shrinkChild.style.cssText           = shrinkChildStyle;

                expand.appendChild(expandChild);
                shrink.appendChild(shrinkChild);
                container.appendChild(expand);
                container.appendChild(shrink);
                containerContainer.appendChild(container);
                rootContainer.appendChild(containerContainer);

                function onExpandScroll() {
                    getState(element).onExpand && getState(element).onExpand();
                }

                function onShrinkScroll() {
                    getState(element).onShrink && getState(element).onShrink();
                }

                addEvent(expand, "scroll", onExpandScroll);
                addEvent(shrink, "scroll", onShrinkScroll);

                // Store the event handlers here so that they may be removed when uninstall is called.
                // See uninstall function for an explanation why it is needed.
                getState(element).onExpandScroll = onExpandScroll;
                getState(element).onShrinkScroll = onShrinkScroll;
            }

            function registerListenersAndPositionElements() {
                function updateChildSizes(element, width, height) {
                    var expandChild             = getExpandChildElement(element);
                    var expandWidth             = getExpandWidth(width);
                    var expandHeight            = getExpandHeight(height);
                    expandChild.style.setProperty("width", expandWidth + "px", options.important ? "important" : "");
                    expandChild.style.setProperty("height", expandHeight + "px", options.important ? "important" : "");
                }

                function updateDetectorElements(done) {
                    var width           = element.offsetWidth;
                    var height          = element.offsetHeight;

                    // Check whether the size has actually changed since last time the algorithm ran. If not, some steps may be skipped.
                    var sizeChanged = width !== getState(element).lastWidth || height !== getState(element).lastHeight;

                    debug("Storing current size", width, height);

                    // Store the size of the element sync here, so that multiple scroll events may be ignored in the event listeners.
                    // Otherwise the if-check in handleScroll is useless.
                    storeCurrentSize(element, width, height);

                    // Since we delay the processing of the batch, there is a risk that uninstall has been called before the batch gets to execute.
                    // Since there is no way to cancel the fn executions, we need to add an uninstall guard to all fns of the batch.

                    batchProcessor.add(0, function performUpdateChildSizes() {
                        if (!sizeChanged) {
                            return;
                        }

                        if (!getState(element)) {
                            debug("Aborting because element has been uninstalled");
                            return;
                        }

                        if (!areElementsInjected()) {
                            debug("Aborting because element container has not been initialized");
                            return;
                        }

                        if (options.debug) {
                            var w = element.offsetWidth;
                            var h = element.offsetHeight;

                            if (w !== width || h !== height) {
                                reporter.warn(idHandler.get(element), "Scroll: Size changed before updating detector elements.");
                            }
                        }

                        updateChildSizes(element, width, height);
                    });

                    batchProcessor.add(1, function updateScrollbars() {
                        // This function needs to be invoked event though the size is unchanged. The element could have been resized very quickly and then
                        // been restored to the original size, which will have changed the scrollbar positions.

                        if (!getState(element)) {
                            debug("Aborting because element has been uninstalled");
                            return;
                        }

                        if (!areElementsInjected()) {
                            debug("Aborting because element container has not been initialized");
                            return;
                        }

                        positionScrollbars(element, width, height);
                    });

                    if (sizeChanged && done) {
                        batchProcessor.add(2, function () {
                            if (!getState(element)) {
                                debug("Aborting because element has been uninstalled");
                                return;
                            }

                            if (!areElementsInjected()) {
                              debug("Aborting because element container has not been initialized");
                              return;
                            }

                            done();
                        });
                    }
                }

                function areElementsInjected() {
                    return !!getState(element).container;
                }

                function notifyListenersIfNeeded() {
                    function isFirstNotify() {
                        return getState(element).lastNotifiedWidth === undefined;
                    }

                    debug("notifyListenersIfNeeded invoked");

                    var state = getState(element);

                    // Don't notify if the current size is the start size, and this is the first notification.
                    if (isFirstNotify() && state.lastWidth === state.startSize.width && state.lastHeight === state.startSize.height) {
                        return debug("Not notifying: Size is the same as the start size, and there has been no notification yet.");
                    }

                    // Don't notify if the size already has been notified.
                    if (state.lastWidth === state.lastNotifiedWidth && state.lastHeight === state.lastNotifiedHeight) {
                        return debug("Not notifying: Size already notified");
                    }


                    debug("Current size not notified, notifying...");
                    state.lastNotifiedWidth = state.lastWidth;
                    state.lastNotifiedHeight = state.lastHeight;
                    forEach(getState(element).listeners, function (listener) {
                        listener(element);
                    });
                }

                function handleRender() {
                    debug("startanimation triggered.");

                    if (isUnrendered(element)) {
                        debug("Ignoring since element is still unrendered...");
                        return;
                    }

                    debug("Element rendered.");
                    var expand = getExpandElement(element);
                    var shrink = getShrinkElement(element);
                    if (expand.scrollLeft === 0 || expand.scrollTop === 0 || shrink.scrollLeft === 0 || shrink.scrollTop === 0) {
                        debug("Scrollbars out of sync. Updating detector elements...");
                        updateDetectorElements(notifyListenersIfNeeded);
                    }
                }

                function handleScroll() {
                    debug("Scroll detected.");

                    if (isUnrendered(element)) {
                        // Element is still unrendered. Skip this scroll event.
                        debug("Scroll event fired while unrendered. Ignoring...");
                        return;
                    }

                    updateDetectorElements(notifyListenersIfNeeded);
                }

                debug("registerListenersAndPositionElements invoked.");

                if (!getState(element)) {
                    debug("Aborting because element has been uninstalled");
                    return;
                }

                getState(element).onRendered = handleRender;
                getState(element).onExpand = handleScroll;
                getState(element).onShrink = handleScroll;

                var style = getState(element).style;
                updateChildSizes(element, style.width, style.height);
            }

            function finalizeDomMutation() {
                debug("finalizeDomMutation invoked.");

                if (!getState(element)) {
                    debug("Aborting because element has been uninstalled");
                    return;
                }

                var style = getState(element).style;
                storeCurrentSize(element, style.width, style.height);
                positionScrollbars(element, style.width, style.height);
            }

            function ready() {
                callback(element);
            }

            function install() {
                debug("Installing...");
                initListeners();
                storeStartSize();

                batchProcessor.add(0, storeStyle);
                batchProcessor.add(1, injectScrollElements);
                batchProcessor.add(2, registerListenersAndPositionElements);
                batchProcessor.add(3, finalizeDomMutation);
                batchProcessor.add(4, ready);
            }

            debug("Making detectable...");

            if (isDetached(element)) {
                debug("Element is detached");

                injectContainerElement();

                debug("Waiting until element is attached...");

                getState(element).onRendered = function () {
                    debug("Element is now attached");
                    install();
                };
            } else {
                install();
            }
        }

        function uninstall(element) {
            var state = getState(element);

            if (!state) {
                // Uninstall has been called on a non-erd element.
                return;
            }

            // Uninstall may have been called in the following scenarios:
            // (1) Right between the sync code and async batch (here state.busy = true, but nothing have been registered or injected).
            // (2) In the ready callback of the last level of the batch by another element (here, state.busy = true, but all the stuff has been injected).
            // (3) After the installation process (here, state.busy = false and all the stuff has been injected).
            // So to be on the safe side, let's check for each thing before removing.

            // We need to remove the event listeners, because otherwise the event might fire on an uninstall element which results in an error when trying to get the state of the element.
            state.onExpandScroll && removeEvent(getExpandElement(element), "scroll", state.onExpandScroll);
            state.onShrinkScroll && removeEvent(getShrinkElement(element), "scroll", state.onShrinkScroll);
            state.onAnimationStart && removeEvent(state.container, "animationstart", state.onAnimationStart);

            state.container && element.removeChild(state.container);
        }

        return {
            makeDetectable: makeDetectable,
            addListener: addListener,
            uninstall: uninstall,
            initDocument: initDocument
        };
    };

    var forEach$1                 = collectionUtils.forEach;









    //Detection strategies.



    function isCollection(obj) {
        return Array.isArray(obj) || obj.length !== undefined;
    }

    function toArray(collection) {
        if (!Array.isArray(collection)) {
            var array = [];
            forEach$1(collection, function (obj) {
                array.push(obj);
            });
            return array;
        } else {
            return collection;
        }
    }

    function isElement(obj) {
        return obj && obj.nodeType === 1;
    }

    /**
     * @typedef idHandler
     * @type {object}
     * @property {function} get Gets the resize detector id of the element.
     * @property {function} set Generate and sets the resize detector id of the element.
     */

    /**
     * @typedef Options
     * @type {object}
     * @property {boolean} callOnAdd    Determines if listeners should be called when they are getting added.
                                        Default is true. If true, the listener is guaranteed to be called when it has been added.
                                        If false, the listener will not be guarenteed to be called when it has been added (does not prevent it from being called).
     * @property {idHandler} idHandler  A custom id handler that is responsible for generating, setting and retrieving id's for elements.
                                        If not provided, a default id handler will be used.
     * @property {reporter} reporter    A custom reporter that handles reporting logs, warnings and errors.
                                        If not provided, a default id handler will be used.
                                        If set to false, then nothing will be reported.
     * @property {boolean} debug        If set to true, the the system will report debug messages as default for the listenTo method.
     */

    /**
     * Creates an element resize detector instance.
     * @public
     * @param {Options?} options Optional global options object that will decide how this instance will work.
     */
    var elementResizeDetector = function(options) {
        options = options || {};

        //idHandler is currently not an option to the listenTo function, so it should not be added to globalOptions.
        var idHandler$1;

        if (options.idHandler) {
            // To maintain compatability with idHandler.get(element, readonly), make sure to wrap the given idHandler
            // so that readonly flag always is true when it's used here. This may be removed next major version bump.
            idHandler$1 = {
                get: function (element) { return options.idHandler.get(element, true); },
                set: options.idHandler.set
            };
        } else {
            var idGenerator$1 = idGenerator();
            var defaultIdHandler = idHandler({
                idGenerator: idGenerator$1,
                stateHandler: stateHandler
            });
            idHandler$1 = defaultIdHandler;
        }

        //reporter is currently not an option to the listenTo function, so it should not be added to globalOptions.
        var reporter$1 = options.reporter;

        if(!reporter$1) {
            //If options.reporter is false, then the reporter should be quiet.
            var quiet = reporter$1 === false;
            reporter$1 = reporter(quiet);
        }

        //batchProcessor is currently not an option to the listenTo function, so it should not be added to globalOptions.
        var batchProcessor$1 = getOption(options, "batchProcessor", batchProcessor({ reporter: reporter$1 }));

        //Options to be used as default for the listenTo function.
        var globalOptions = {};
        globalOptions.callOnAdd     = !!getOption(options, "callOnAdd", true);
        globalOptions.debug         = !!getOption(options, "debug", false);

        var eventListenerHandler    = listenerHandler(idHandler$1);
        var elementUtils$1            = elementUtils({
            stateHandler: stateHandler
        });

        //The detection strategy to be used.
        var detectionStrategy;
        var desiredStrategy = getOption(options, "strategy", "object");
        var importantCssRules = getOption(options, "important", false);
        var strategyOptions = {
            reporter: reporter$1,
            batchProcessor: batchProcessor$1,
            stateHandler: stateHandler,
            idHandler: idHandler$1,
            important: importantCssRules
        };

        if(desiredStrategy === "scroll") {
            if (browserDetector.isLegacyOpera()) {
                reporter$1.warn("Scroll strategy is not supported on legacy Opera. Changing to object strategy.");
                desiredStrategy = "object";
            } else if (browserDetector.isIE(9)) {
                reporter$1.warn("Scroll strategy is not supported on IE9. Changing to object strategy.");
                desiredStrategy = "object";
            }
        }

        if(desiredStrategy === "scroll") {
            detectionStrategy = scroll(strategyOptions);
        } else if(desiredStrategy === "object") {
            detectionStrategy = object(strategyOptions);
        } else {
            throw new Error("Invalid strategy name: " + desiredStrategy);
        }

        //Calls can be made to listenTo with elements that are still being installed.
        //Also, same elements can occur in the elements list in the listenTo function.
        //With this map, the ready callbacks can be synchronized between the calls
        //so that the ready callback can always be called when an element is ready - even if
        //it wasn't installed from the function itself.
        var onReadyCallbacks = {};

        /**
         * Makes the given elements resize-detectable and starts listening to resize events on the elements. Calls the event callback for each event for each element.
         * @public
         * @param {Options?} options Optional options object. These options will override the global options. Some options may not be overriden, such as idHandler.
         * @param {element[]|element} elements The given array of elements to detect resize events of. Single element is also valid.
         * @param {function} listener The callback to be executed for each resize event for each element.
         */
        function listenTo(options, elements, listener) {
            function onResizeCallback(element) {
                var listeners = eventListenerHandler.get(element);
                forEach$1(listeners, function callListenerProxy(listener) {
                    listener(element);
                });
            }

            function addListener(callOnAdd, element, listener) {
                eventListenerHandler.add(element, listener);

                if(callOnAdd) {
                    listener(element);
                }
            }

            //Options object may be omitted.
            if(!listener) {
                listener = elements;
                elements = options;
                options = {};
            }

            if(!elements) {
                throw new Error("At least one element required.");
            }

            if(!listener) {
                throw new Error("Listener required.");
            }

            if (isElement(elements)) {
                // A single element has been passed in.
                elements = [elements];
            } else if (isCollection(elements)) {
                // Convert collection to array for plugins.
                // TODO: May want to check so that all the elements in the collection are valid elements.
                elements = toArray(elements);
            } else {
                return reporter$1.error("Invalid arguments. Must be a DOM element or a collection of DOM elements.");
            }

            var elementsReady = 0;

            var callOnAdd = getOption(options, "callOnAdd", globalOptions.callOnAdd);
            var onReadyCallback = getOption(options, "onReady", function noop() {});
            var debug = getOption(options, "debug", globalOptions.debug);

            forEach$1(elements, function attachListenerToElement(element) {
                if (!stateHandler.getState(element)) {
                    stateHandler.initState(element);
                    idHandler$1.set(element);
                }

                var id = idHandler$1.get(element);

                debug && reporter$1.log("Attaching listener to element", id, element);

                if(!elementUtils$1.isDetectable(element)) {
                    debug && reporter$1.log(id, "Not detectable.");
                    if(elementUtils$1.isBusy(element)) {
                        debug && reporter$1.log(id, "System busy making it detectable");

                        //The element is being prepared to be detectable. Do not make it detectable.
                        //Just add the listener, because the element will soon be detectable.
                        addListener(callOnAdd, element, listener);
                        onReadyCallbacks[id] = onReadyCallbacks[id] || [];
                        onReadyCallbacks[id].push(function onReady() {
                            elementsReady++;

                            if(elementsReady === elements.length) {
                                onReadyCallback();
                            }
                        });
                        return;
                    }

                    debug && reporter$1.log(id, "Making detectable...");
                    //The element is not prepared to be detectable, so do prepare it and add a listener to it.
                    elementUtils$1.markBusy(element, true);
                    return detectionStrategy.makeDetectable({ debug: debug, important: importantCssRules }, element, function onElementDetectable(element) {
                        debug && reporter$1.log(id, "onElementDetectable");

                        if (stateHandler.getState(element)) {
                            elementUtils$1.markAsDetectable(element);
                            elementUtils$1.markBusy(element, false);
                            detectionStrategy.addListener(element, onResizeCallback);
                            addListener(callOnAdd, element, listener);

                            // Since the element size might have changed since the call to "listenTo", we need to check for this change,
                            // so that a resize event may be emitted.
                            // Having the startSize object is optional (since it does not make sense in some cases such as unrendered elements), so check for its existance before.
                            // Also, check the state existance before since the element may have been uninstalled in the installation process.
                            var state = stateHandler.getState(element);
                            if (state && state.startSize) {
                                var width = element.offsetWidth;
                                var height = element.offsetHeight;
                                if (state.startSize.width !== width || state.startSize.height !== height) {
                                    onResizeCallback(element);
                                }
                            }

                            if(onReadyCallbacks[id]) {
                                forEach$1(onReadyCallbacks[id], function(callback) {
                                    callback();
                                });
                            }
                        } else {
                            // The element has been unisntalled before being detectable.
                            debug && reporter$1.log(id, "Element uninstalled before being detectable.");
                        }

                        delete onReadyCallbacks[id];

                        elementsReady++;
                        if(elementsReady === elements.length) {
                            onReadyCallback();
                        }
                    });
                }

                debug && reporter$1.log(id, "Already detecable, adding listener.");

                //The element has been prepared to be detectable and is ready to be listened to.
                addListener(callOnAdd, element, listener);
                elementsReady++;
            });

            if(elementsReady === elements.length) {
                onReadyCallback();
            }
        }

        function uninstall(elements) {
            if(!elements) {
                return reporter$1.error("At least one element is required.");
            }

            if (isElement(elements)) {
                // A single element has been passed in.
                elements = [elements];
            } else if (isCollection(elements)) {
                // Convert collection to array for plugins.
                // TODO: May want to check so that all the elements in the collection are valid elements.
                elements = toArray(elements);
            } else {
                return reporter$1.error("Invalid arguments. Must be a DOM element or a collection of DOM elements.");
            }

            forEach$1(elements, function (element) {
                eventListenerHandler.removeAllListeners(element);
                detectionStrategy.uninstall(element);
                stateHandler.cleanState(element);
            });
        }

        function initDocument(targetDocument) {
            detectionStrategy.initDocument && detectionStrategy.initDocument(targetDocument);
        }

        return {
            listenTo: listenTo,
            removeListener: eventListenerHandler.removeListener,
            removeAllListeners: eventListenerHandler.removeAllListeners,
            uninstall: uninstall,
            initDocument: initDocument
        };
    };

    function getOption(options, name, defaultValue) {
        var value = options[name];

        if((value === undefined || value === null) && defaultValue !== undefined) {
            return defaultValue;
        }

        return value;
    }

    var erd = elementResizeDetector({ strategy: "scroll" });
    function watchResize(element, handler) {
        erd.listenTo(element, handler);
        var currentHandler = handler;
        return {
            update: function (newHandler) {
                erd.removeListener(element, currentHandler);
                erd.listenTo(element, newHandler);
                currentHandler = newHandler;
            },
            destroy: function () {
                erd.removeListener(element, currentHandler);
            },
        };
    }

    /* src/Room.svelte generated by Svelte v3.29.7 */
    const file$8 = "src/Room.svelte";

    function create_fragment$8(ctx) {
    	let div;
    	let canvas_1;
    	let watchResize_action;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			canvas_1 = element("canvas");
    			attr_dev(canvas_1, "class", "absolute");
    			set_style(canvas_1, "width", /*canvasW*/ ctx[1] + "px");
    			set_style(canvas_1, "height", /*canvasH*/ ctx[2] + "px");
    			add_location(canvas_1, file$8, 140, 2, 3384);
    			attr_dev(div, "class", "w-full h-full svelte-1kuj9kb");
    			add_location(div, file$8, 137, 0, 3291);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, canvas_1);
    			/*canvas_1_binding*/ ctx[8](canvas_1);

    			if (!mounted) {
    				dispose = action_destroyer(watchResize_action = watchResize.call(null, div, /*watchResize_function*/ ctx[9]));
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*canvasW*/ 2) {
    				set_style(canvas_1, "width", /*canvasW*/ ctx[1] + "px");
    			}

    			if (dirty & /*canvasH*/ 4) {
    				set_style(canvas_1, "height", /*canvasH*/ ctx[2] + "px");
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*canvas_1_binding*/ ctx[8](null);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Room", slots, []);
    	let canvas;
    	let canvasW;
    	let canvasH;
    	let { w } = $$props;
    	let { l } = $$props;
    	let { h } = $$props;
    	let { vent } = $$props;

    	function draw(cW, cH, vent) {
    		$$invalidate(1, canvasW = cW);
    		$$invalidate(2, canvasH = cH);

    		// console.log(cW, cH)
    		if (!canvas) return;

    		$$invalidate(0, canvas.width = cW * 2, canvas);
    		$$invalidate(0, canvas.height = cH * 2, canvas);
    		const scale = Math.min(cW, cH) * 2.3 / (w + l);

    		// console.log(scale)
    		var iso = new isomer$1(canvas,
    		{
    				scale,
    				originX: cW - (l - w) * scale / 2,
    				originY: cH * 2
    			});

    		iso.canvas.clear();
    		var red = new isomer$1.Color(160, 60, 50);
    		var trans = new isomer$1.Color(200, 200, 200, 0.1);
    		var win = new isomer$1.Color(100, 150, 250, 0.2);
    		var wall = new isomer$1.Color(230, 230, 230);
    		var door = new isomer$1.Color(210, 210, 210);
    		var wallSize = 20;
    		var length = l + 2 * wallSize;
    		var width = w + 2 * wallSize;
    		iso.add(isomer$1.Shape.Prism(isomer$1.Point(length - wallSize, 0, 0), wallSize, width, h), wall);
    		iso.add(isomer$1.Shape.Prism(isomer$1.Point(0, width - wallSize, 0), length - wallSize, 20, h), wall);
    		const ventP = Math.max(0, 2 - vent);
    		const backWindows = Math.round(l / (135 + ventP * 90));
    		const backWindowGap = (l - backWindows * 110) / (backWindows + 1);

    		// console.log({ backWindows, backWindowGap });
    		for (let i = 0; i < backWindows; i++) {
    			ww(i * (110 + backWindowGap) + backWindowGap, width - wallSize, iso, win);
    		}

    		iso.add(isomer$1.Shape.Prism(isomer$1.Point(0, 0, 0), length, wallSize, h), trans);
    		iso.add(isomer$1.Shape.Prism(isomer$1.Point(0, 0, 0), wallSize, width, h), trans);

    		iso.add(
    			new isomer$1.Path([
    					isomer$1.Point(length - 200, 0, 0),
    					isomer$1.Point(length - 110, 0, 0),
    					isomer$1.Point(length - 110, 0, 200),
    					isomer$1.Point(length - 200, 0, 200)
    				]),
    			door
    		);

    		if (vent >= 3) {
    			const lDoor = l - 220;
    			const frontWindows = Math.round(lDoor / 155);
    			const frontWindowGap = Math.max(0, (lDoor - frontWindows * 110) / (frontWindows + 1));

    			// console.log({ frontWindows, frontWindowGap });
    			for (let i = 0; i < frontWindows; i++) {
    				ww(i * (110 + frontWindowGap) + frontWindowGap + wallSize, 0, iso, win);
    			}
    		}
    	}

    	function ww(x, y, iso, color) {
    		iso.add(
    			new isomer$1.Path([
    					isomer$1.Point(x, y, 100),
    					isomer$1.Point(x + 50, y, 100),
    					isomer$1.Point(x + 50, y, 150),
    					isomer$1.Point(x, y, 150)
    				]),
    			color
    		);

    		iso.add(
    			new isomer$1.Path([
    					isomer$1.Point(x + 60, y, 100),
    					isomer$1.Point(x + 110, y, 100),
    					isomer$1.Point(x + 110, y, 150),
    					isomer$1.Point(x + 60, y, 150)
    				]),
    			color
    		);

    		iso.add(
    			new isomer$1.Path([
    					isomer$1.Point(x, y, 160),
    					isomer$1.Point(x + 50, y, 160),
    					isomer$1.Point(x + 50, y, 210),
    					isomer$1.Point(x, y, 210)
    				]),
    			color
    		);

    		iso.add(
    			new isomer$1.Path([
    					isomer$1.Point(x + 60, y, 160),
    					isomer$1.Point(x + 110, y, 160),
    					isomer$1.Point(x + 110, y, 210),
    					isomer$1.Point(x + 60, y, 210)
    				]),
    			color
    		);
    	}

    	const writable_props = ["w", "l", "h", "vent"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Room> was created with unknown prop '${key}'`);
    	});

    	function canvas_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			canvas = $$value;
    			$$invalidate(0, canvas);
    		});
    	}

    	const watchResize_function = n => draw(n.clientWidth, n.clientHeight);

    	$$self.$$set = $$props => {
    		if ("w" in $$props) $$invalidate(4, w = $$props.w);
    		if ("l" in $$props) $$invalidate(5, l = $$props.l);
    		if ("h" in $$props) $$invalidate(6, h = $$props.h);
    		if ("vent" in $$props) $$invalidate(7, vent = $$props.vent);
    	};

    	$$self.$capture_state = () => ({
    		Isomer: isomer$1,
    		Point: isomer$1.Point,
    		Path: isomer$1.Path,
    		Shape: isomer$1.Shape,
    		Vector: isomer$1.Vector,
    		Color: isomer$1.Color,
    		onMount,
    		watchResize,
    		canvas,
    		canvasW,
    		canvasH,
    		w,
    		l,
    		h,
    		vent,
    		draw,
    		ww
    	});

    	$$self.$inject_state = $$props => {
    		if ("canvas" in $$props) $$invalidate(0, canvas = $$props.canvas);
    		if ("canvasW" in $$props) $$invalidate(1, canvasW = $$props.canvasW);
    		if ("canvasH" in $$props) $$invalidate(2, canvasH = $$props.canvasH);
    		if ("w" in $$props) $$invalidate(4, w = $$props.w);
    		if ("l" in $$props) $$invalidate(5, l = $$props.l);
    		if ("h" in $$props) $$invalidate(6, h = $$props.h);
    		if ("vent" in $$props) $$invalidate(7, vent = $$props.vent);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*canvas, l, w, h, canvasW, canvasH, vent*/ 247) {
    			// onMount(() => setTimeout(() => draw(canvasW, canvasH)))
    			 if (canvas && l && w && h && canvasW) {
    				draw(canvasW, canvasH, vent);
    			}
    		}
    	};

    	return [
    		canvas,
    		canvasW,
    		canvasH,
    		draw,
    		w,
    		l,
    		h,
    		vent,
    		canvas_1_binding,
    		watchResize_function
    	];
    }

    class Room extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, { w: 4, l: 5, h: 6, vent: 7 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Room",
    			options,
    			id: create_fragment$8.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*w*/ ctx[4] === undefined && !("w" in props)) {
    			console.warn("<Room> was created without expected prop 'w'");
    		}

    		if (/*l*/ ctx[5] === undefined && !("l" in props)) {
    			console.warn("<Room> was created without expected prop 'l'");
    		}

    		if (/*h*/ ctx[6] === undefined && !("h" in props)) {
    			console.warn("<Room> was created without expected prop 'h'");
    		}

    		if (/*vent*/ ctx[7] === undefined && !("vent" in props)) {
    			console.warn("<Room> was created without expected prop 'vent'");
    		}
    	}

    	get w() {
    		throw new Error("<Room>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set w(value) {
    		throw new Error("<Room>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get l() {
    		throw new Error("<Room>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set l(value) {
    		throw new Error("<Room>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get h() {
    		throw new Error("<Room>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set h(value) {
    		throw new Error("<Room>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get vent() {
    		throw new Error("<Room>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set vent(value) {
    		throw new Error("<Room>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/WindowInfo.svelte generated by Svelte v3.29.7 */
    const file$9 = "src/WindowInfo.svelte";

    function create_fragment$9(ctx) {
    	let div2;
    	let div0;
    	let svg;
    	let path;
    	let t0;
    	let h1;
    	let t2;
    	let div1;
    	let p0;
    	let t4;
    	let p1;
    	let t6;
    	let p2;
    	let t7;
    	let a;
    	let t9;
    	let t10;
    	let p3;
    	let t12;
    	let p4;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			t0 = space();
    			h1 = element("h1");
    			h1.textContent = "Ventilación";
    			t2 = space();
    			div1 = element("div");
    			p0 = element("p");
    			p0.textContent = "Mediremos la ventilación existente como la cantidad de veces que el aire\n      del interior se renueva completamente en una hora (ACH, del inglés air\n      changes per hour).";
    			t4 = space();
    			p1 = element("p");
    			p1.textContent = "La representación de la ventilación en la imagen de la calculadora es solo\n      ilustrativa y no debe utilizarse para estimar la tasa de ventilación de un\n      aula o sala existente. Cuando no se pueda medir, lo más seguro es estimar\n      una ventilación de 0.5 ACH.";
    			t6 = space();
    			p2 = element("p");
    			t7 = text("Puedes aprender cómo medirla correctamente en la\n      ");
    			a = element("a");
    			a.textContent = "Guía en 5 pasos para medir la tasa de renovación de aire en aulas";
    			t9 = text("\n      de Harvard T.H. Chan School of Public Health.");
    			t10 = space();
    			p3 = element("p");
    			p3.textContent = "Aunque la tasa esperada de renovación de aire en las aulas en los colegios\n      españoles debería ser 3 ACH la tasa más habitual ronda 1.5 ACH pero puede\n      ser peor, especialmente si las ventanas se cierran.";
    			t12 = space();
    			p4 = element("p");
    			p4.textContent = "No es habitual tener una tasa de más de 3 ACH en un colegio, pero puede\n      conseguirse si la ventilación se ha mejorado con algún sistema adicional.";
    			attr_dev(path, "d", "M14.53 4.53l-1.06-1.06L9 7.94 4.53 3.47 3.47 4.53 7.94 9l-4.47 4.47\n        1.06 1.06L9 10.06l4.47 4.47 1.06-1.06L10.06 9z");
    			add_location(path, file$9, 14, 6, 396);
    			attr_dev(svg, "class", "fill-current text-black w-8 h-8");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "viewBox", "0 0 18 18");
    			add_location(svg, file$9, 10, 4, 271);
    			attr_dev(div0, "class", "modal-close cursor-pointer z-50 absolute top-0 right-0");
    			add_location(div0, file$9, 7, 2, 155);
    			attr_dev(h1, "class", "text-xl");
    			add_location(h1, file$9, 19, 2, 562);
    			attr_dev(p0, "class", "mt-2 md:mt-6");
    			add_location(p0, file$9, 21, 4, 633);
    			attr_dev(p1, "class", "mt-2 md:mt-6 text-sm rounded bg-yellow-200 p-3 -mx-3 md:p-5\n      md:-mx-5 text-yellow-900");
    			add_location(p1, file$9, 27, 4, 853);
    			attr_dev(a, "href", "https://schools.forhealth.org/ventilation-guide/");
    			attr_dev(a, "class", "text-blue-600 underline");
    			add_location(a, file$9, 38, 6, 1338);
    			attr_dev(p2, "class", "mt-2 md:mt-6");
    			add_location(p2, file$9, 36, 4, 1252);
    			attr_dev(p3, "class", "mt-2 md:mt-6");
    			add_location(p3, file$9, 46, 4, 1597);
    			attr_dev(p4, "class", "mt-2 md:mt-6");
    			add_location(p4, file$9, 52, 4, 1855);
    			attr_dev(div1, "class", "body text-700");
    			add_location(div1, file$9, 20, 2, 601);
    			attr_dev(div2, "class", " bg-white z-10 relative");
    			add_location(div2, file$9, 5, 0, 114);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, svg);
    			append_dev(svg, path);
    			append_dev(div2, t0);
    			append_dev(div2, h1);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div1, p0);
    			append_dev(div1, t4);
    			append_dev(div1, p1);
    			append_dev(div1, t6);
    			append_dev(div1, p2);
    			append_dev(p2, t7);
    			append_dev(p2, a);
    			append_dev(p2, t9);
    			append_dev(div1, t10);
    			append_dev(div1, p3);
    			append_dev(div1, t12);
    			append_dev(div1, p4);

    			if (!mounted) {
    				dispose = listen_dev(div0, "click", /*click_handler*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("WindowInfo", slots, []);
    	const dispatch = createEventDispatcher();
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<WindowInfo> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => dispatch("close");
    	$$self.$capture_state = () => ({ createEventDispatcher, dispatch });
    	return [dispatch, click_handler];
    }

    class WindowInfo extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "WindowInfo",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src/CalculadoraDesktop.svelte generated by Svelte v3.29.7 */
    const file$a = "src/CalculadoraDesktop.svelte";

    // (89:6) {#if windowInfo}
    function create_if_block$2(ctx) {
    	let div;
    	let windowinfo;
    	let current;
    	windowinfo = new WindowInfo({ $$inline: true });
    	windowinfo.$on("close", /*close_handler*/ ctx[17]);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(windowinfo.$$.fragment);
    			attr_dev(div, "class", " p-6 bg-white rounded shadow z-10");
    			set_style(div, "width", "150%");
    			add_location(div, file$a, 89, 8, 2348);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(windowinfo, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(windowinfo.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(windowinfo.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(windowinfo);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(89:6) {#if windowInfo}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$a(ctx) {
    	let div20;
    	let div0;
    	let h1;
    	let t1;
    	let div14;
    	let div5;
    	let div1;
    	let rangeslider0;
    	let updating_values;
    	let t2;
    	let div3;
    	let div2;
    	let t3;
    	let t4_value = /*h*/ ctx[2] / 100 + "";
    	let t4;
    	let t5;
    	let t6;
    	let div4;
    	let room;
    	let t7;
    	let div8;
    	let div6;
    	let t8;
    	let button;
    	let t10;
    	let rangeslider1;
    	let updating_values_1;
    	let t11;
    	let div7;
    	let t12_value = /*vRen*/ ctx[11][/*vent*/ ctx[3]] + "";
    	let t12;
    	let t13;
    	let t14;
    	let t15;
    	let div13;
    	let div9;
    	let t16;
    	let t17_value = /*l*/ ctx[1] / 100 + "";
    	let t17;
    	let t18;
    	let t19_value = /*w*/ ctx[0] / 100 + "";
    	let t19;
    	let t20;
    	let t21_value = /*h*/ ctx[2] / 100 + "";
    	let t21;
    	let t22;
    	let t23;
    	let div10;
    	let t24;
    	let t25_value = /*vLabels*/ ctx[10][/*vent*/ ctx[3]] + "";
    	let t25;
    	let t26;
    	let t27_value = /*vRen*/ ctx[11][/*vent*/ ctx[3]] + "";
    	let t27;
    	let t28;
    	let t29;
    	let div11;
    	let t30;
    	let t31;
    	let t32;
    	let t33;
    	let div12;
    	let a;
    	let t35;
    	let div19;
    	let div16;
    	let div15;
    	let t36;
    	let t37_value = /*w*/ ctx[0] / 100 + "";
    	let t37;
    	let t38;
    	let t39;
    	let rangeslider2;
    	let updating_values_2;
    	let t40;
    	let div18;
    	let div17;
    	let t41;
    	let t42_value = /*l*/ ctx[1] / 100 + "";
    	let t42;
    	let t43;
    	let t44;
    	let rangeslider3;
    	let updating_values_3;
    	let current;
    	let mounted;
    	let dispose;

    	function rangeslider0_values_binding(value) {
    		/*rangeslider0_values_binding*/ ctx[13].call(null, value);
    	}

    	let rangeslider0_props = {
    		step: 10,
    		min: 0,
    		max: MAX_H,
    		range: "max",
    		pips: true,
    		all: "label",
    		formatter: /*func*/ ctx[12],
    		pipstep: 5,
    		vertical: true,
    		id: "heightSlider"
    	};

    	if (/*hs*/ ctx[7] !== void 0) {
    		rangeslider0_props.values = /*hs*/ ctx[7];
    	}

    	rangeslider0 = new RangeSlider({
    			props: rangeslider0_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(rangeslider0, "values", rangeslider0_values_binding));

    	room = new Room({
    			props: {
    				l: /*l*/ ctx[1],
    				w: /*w*/ ctx[0],
    				h: /*h*/ ctx[2],
    				vent: /*vent*/ ctx[3]
    			},
    			$$inline: true
    		});

    	function rangeslider1_values_binding(value) {
    		/*rangeslider1_values_binding*/ ctx[16].call(null, value);
    	}

    	let rangeslider1_props = {
    		step: 1,
    		min: 0,
    		max: 4,
    		pips: true,
    		all: "label",
    		formatter: /*func_1*/ ctx[15]
    	};

    	if (/*vs*/ ctx[8] !== void 0) {
    		rangeslider1_props.values = /*vs*/ ctx[8];
    	}

    	rangeslider1 = new RangeSlider({
    			props: rangeslider1_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(rangeslider1, "values", rangeslider1_values_binding));
    	let if_block = /*windowInfo*/ ctx[9] && create_if_block$2(ctx);

    	function rangeslider2_values_binding(value) {
    		/*rangeslider2_values_binding*/ ctx[19].call(null, value);
    	}

    	let rangeslider2_props = {
    		step: 10,
    		min: 0,
    		max: MAX_W,
    		range: "max",
    		pips: true,
    		all: "label",
    		formatter: /*func_2*/ ctx[18],
    		pipstep: 5
    	};

    	if (/*ws*/ ctx[5] !== void 0) {
    		rangeslider2_props.values = /*ws*/ ctx[5];
    	}

    	rangeslider2 = new RangeSlider({
    			props: rangeslider2_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(rangeslider2, "values", rangeslider2_values_binding));

    	function rangeslider3_values_binding(value) {
    		/*rangeslider3_values_binding*/ ctx[20].call(null, value);
    	}

    	let rangeslider3_props = {
    		step: 10,
    		min: 0,
    		max: MAX_L,
    		range: "min",
    		pips: true,
    		all: "label",
    		formatter: func_3,
    		pipstep: 5
    	};

    	if (/*ls*/ ctx[6] !== void 0) {
    		rangeslider3_props.values = /*ls*/ ctx[6];
    	}

    	rangeslider3 = new RangeSlider({
    			props: rangeslider3_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(rangeslider3, "values", rangeslider3_values_binding));

    	const block = {
    		c: function create() {
    			div20 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Calculadora de caudal de filtros HEPA";
    			t1 = space();
    			div14 = element("div");
    			div5 = element("div");
    			div1 = element("div");
    			create_component(rangeslider0.$$.fragment);
    			t2 = space();
    			div3 = element("div");
    			div2 = element("div");
    			t3 = text("alto ");
    			t4 = text(t4_value);
    			t5 = text(" m");
    			t6 = space();
    			div4 = element("div");
    			create_component(room.$$.fragment);
    			t7 = space();
    			div8 = element("div");
    			div6 = element("div");
    			t8 = text("Ventilación existente\n        ");
    			button = element("button");
    			button.textContent = "i";
    			t10 = space();
    			create_component(rangeslider1.$$.fragment);
    			t11 = space();
    			div7 = element("div");
    			t12 = text(t12_value);
    			t13 = text(" renovaciones por hora");
    			t14 = space();
    			if (if_block) if_block.c();
    			t15 = space();
    			div13 = element("div");
    			div9 = element("div");
    			t16 = text("volumen: ");
    			t17 = text(t17_value);
    			t18 = text(" * ");
    			t19 = text(t19_value);
    			t20 = text(" * ");
    			t21 = text(t21_value);
    			t22 = text(" m³");
    			t23 = space();
    			div10 = element("div");
    			t24 = text("ventilación: ");
    			t25 = text(t25_value);
    			t26 = space();
    			t27 = text(t27_value);
    			t28 = text(" ACH");
    			t29 = space();
    			div11 = element("div");
    			t30 = text("CADR necesario: ");
    			t31 = text(/*needCADR*/ ctx[4]);
    			t32 = text(" m³/h");
    			t33 = space();
    			div12 = element("div");
    			a = element("a");
    			a.textContent = "ver filtros";
    			t35 = space();
    			div19 = element("div");
    			div16 = element("div");
    			div15 = element("div");
    			t36 = text("ancho ");
    			t37 = text(t37_value);
    			t38 = text(" m");
    			t39 = space();
    			create_component(rangeslider2.$$.fragment);
    			t40 = space();
    			div18 = element("div");
    			div17 = element("div");
    			t41 = text("largo ");
    			t42 = text(t42_value);
    			t43 = text(" m");
    			t44 = space();
    			create_component(rangeslider3.$$.fragment);
    			attr_dev(h1, "class", "text-center text-xl p-2 shadow");
    			add_location(h1, file$a, 34, 4, 819);
    			attr_dev(div0, "class", "bg-purple-800 text-white");
    			add_location(div0, file$a, 33, 2, 776);
    			attr_dev(div1, "class", "flex flex-column items-end");
    			add_location(div1, file$a, 40, 6, 1008);
    			attr_dev(div2, "class", "transform -rotate-90 origin-bottom-left translate-x-6 absolute\n          bottom-0 mb-3");
    			set_style(div2, "width", window.innerHeight / 2 + "px");
    			add_location(div2, file$a, 56, 8, 1421);
    			attr_dev(div3, "class", "relative w-8");
    			add_location(div3, file$a, 54, 6, 1385);
    			attr_dev(div4, "class", "flex-1");
    			add_location(div4, file$a, 63, 6, 1645);
    			attr_dev(div5, "class", "flex-1 flex flex-row");
    			add_location(div5, file$a, 39, 4, 967);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", " rounded-full bg-blue-500 text-white font-bold w-6 h-6 ml-3\n          shadow hover:bg-blue-400");
    			add_location(button, file$a, 71, 8, 1851);
    			attr_dev(div6, "class", "ml-3");
    			add_location(div6, file$a, 69, 6, 1794);
    			attr_dev(div7, "class", "ml-3");
    			add_location(div7, file$a, 87, 6, 2258);
    			attr_dev(div8, "class", "absolute top-0 left-0 ml-4 mt-4 w-1/3 z-10");
    			add_location(div8, file$a, 67, 4, 1730);
    			add_location(div9, file$a, 96, 6, 2592);
    			add_location(div10, file$a, 97, 6, 2655);
    			attr_dev(div11, "class", "text-xl text-purple-700");
    			add_location(div11, file$a, 98, 6, 2718);
    			attr_dev(a, "href", "#filtros");
    			attr_dev(a, "class", "text-blue-600 underline");
    			add_location(a, file$a, 100, 8, 2813);
    			add_location(div12, file$a, 99, 6, 2799);
    			attr_dev(div13, "class", "absolute top-0 right-0 mt-4 mr-4 w-1/3 text-right");
    			add_location(div13, file$a, 95, 4, 2522);
    			attr_dev(div14, "class", "flex-1 flex relative");
    			add_location(div14, file$a, 38, 2, 928);
    			attr_dev(div15, "class", "text-right mr-3");
    			add_location(div15, file$a, 107, 6, 2980);
    			attr_dev(div16, "class", "flex-1 mr-2");
    			add_location(div16, file$a, 106, 4, 2948);
    			attr_dev(div17, "class", "ml-3");
    			add_location(div17, file$a, 122, 6, 3327);
    			attr_dev(div18, "class", "flex-1");
    			add_location(div18, file$a, 121, 4, 3300);
    			attr_dev(div19, "class", "flex flex-row");
    			add_location(div19, file$a, 105, 2, 2916);
    			attr_dev(div20, "class", "w-full h-full flex flex-col");
    			add_location(div20, file$a, 32, 0, 732);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div20, anchor);
    			append_dev(div20, div0);
    			append_dev(div0, h1);
    			append_dev(div20, t1);
    			append_dev(div20, div14);
    			append_dev(div14, div5);
    			append_dev(div5, div1);
    			mount_component(rangeslider0, div1, null);
    			append_dev(div5, t2);
    			append_dev(div5, div3);
    			append_dev(div3, div2);
    			append_dev(div2, t3);
    			append_dev(div2, t4);
    			append_dev(div2, t5);
    			append_dev(div5, t6);
    			append_dev(div5, div4);
    			mount_component(room, div4, null);
    			append_dev(div14, t7);
    			append_dev(div14, div8);
    			append_dev(div8, div6);
    			append_dev(div6, t8);
    			append_dev(div6, button);
    			append_dev(div8, t10);
    			mount_component(rangeslider1, div8, null);
    			append_dev(div8, t11);
    			append_dev(div8, div7);
    			append_dev(div7, t12);
    			append_dev(div7, t13);
    			append_dev(div8, t14);
    			if (if_block) if_block.m(div8, null);
    			append_dev(div14, t15);
    			append_dev(div14, div13);
    			append_dev(div13, div9);
    			append_dev(div9, t16);
    			append_dev(div9, t17);
    			append_dev(div9, t18);
    			append_dev(div9, t19);
    			append_dev(div9, t20);
    			append_dev(div9, t21);
    			append_dev(div9, t22);
    			append_dev(div13, t23);
    			append_dev(div13, div10);
    			append_dev(div10, t24);
    			append_dev(div10, t25);
    			append_dev(div10, t26);
    			append_dev(div10, t27);
    			append_dev(div10, t28);
    			append_dev(div13, t29);
    			append_dev(div13, div11);
    			append_dev(div11, t30);
    			append_dev(div11, t31);
    			append_dev(div11, t32);
    			append_dev(div13, t33);
    			append_dev(div13, div12);
    			append_dev(div12, a);
    			append_dev(div20, t35);
    			append_dev(div20, div19);
    			append_dev(div19, div16);
    			append_dev(div16, div15);
    			append_dev(div15, t36);
    			append_dev(div15, t37);
    			append_dev(div15, t38);
    			append_dev(div16, t39);
    			mount_component(rangeslider2, div16, null);
    			append_dev(div19, t40);
    			append_dev(div19, div18);
    			append_dev(div18, div17);
    			append_dev(div17, t41);
    			append_dev(div17, t42);
    			append_dev(div17, t43);
    			append_dev(div18, t44);
    			mount_component(rangeslider3, div18, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[14], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			const rangeslider0_changes = {};

    			if (!updating_values && dirty & /*hs*/ 128) {
    				updating_values = true;
    				rangeslider0_changes.values = /*hs*/ ctx[7];
    				add_flush_callback(() => updating_values = false);
    			}

    			rangeslider0.$set(rangeslider0_changes);
    			if ((!current || dirty & /*h*/ 4) && t4_value !== (t4_value = /*h*/ ctx[2] / 100 + "")) set_data_dev(t4, t4_value);
    			const room_changes = {};
    			if (dirty & /*l*/ 2) room_changes.l = /*l*/ ctx[1];
    			if (dirty & /*w*/ 1) room_changes.w = /*w*/ ctx[0];
    			if (dirty & /*h*/ 4) room_changes.h = /*h*/ ctx[2];
    			if (dirty & /*vent*/ 8) room_changes.vent = /*vent*/ ctx[3];
    			room.$set(room_changes);
    			const rangeslider1_changes = {};

    			if (!updating_values_1 && dirty & /*vs*/ 256) {
    				updating_values_1 = true;
    				rangeslider1_changes.values = /*vs*/ ctx[8];
    				add_flush_callback(() => updating_values_1 = false);
    			}

    			rangeslider1.$set(rangeslider1_changes);
    			if ((!current || dirty & /*vent*/ 8) && t12_value !== (t12_value = /*vRen*/ ctx[11][/*vent*/ ctx[3]] + "")) set_data_dev(t12, t12_value);

    			if (/*windowInfo*/ ctx[9]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*windowInfo*/ 512) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div8, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if ((!current || dirty & /*l*/ 2) && t17_value !== (t17_value = /*l*/ ctx[1] / 100 + "")) set_data_dev(t17, t17_value);
    			if ((!current || dirty & /*w*/ 1) && t19_value !== (t19_value = /*w*/ ctx[0] / 100 + "")) set_data_dev(t19, t19_value);
    			if ((!current || dirty & /*h*/ 4) && t21_value !== (t21_value = /*h*/ ctx[2] / 100 + "")) set_data_dev(t21, t21_value);
    			if ((!current || dirty & /*vent*/ 8) && t25_value !== (t25_value = /*vLabels*/ ctx[10][/*vent*/ ctx[3]] + "")) set_data_dev(t25, t25_value);
    			if ((!current || dirty & /*vent*/ 8) && t27_value !== (t27_value = /*vRen*/ ctx[11][/*vent*/ ctx[3]] + "")) set_data_dev(t27, t27_value);
    			if (!current || dirty & /*needCADR*/ 16) set_data_dev(t31, /*needCADR*/ ctx[4]);
    			if ((!current || dirty & /*w*/ 1) && t37_value !== (t37_value = /*w*/ ctx[0] / 100 + "")) set_data_dev(t37, t37_value);
    			const rangeslider2_changes = {};

    			if (!updating_values_2 && dirty & /*ws*/ 32) {
    				updating_values_2 = true;
    				rangeslider2_changes.values = /*ws*/ ctx[5];
    				add_flush_callback(() => updating_values_2 = false);
    			}

    			rangeslider2.$set(rangeslider2_changes);
    			if ((!current || dirty & /*l*/ 2) && t42_value !== (t42_value = /*l*/ ctx[1] / 100 + "")) set_data_dev(t42, t42_value);
    			const rangeslider3_changes = {};

    			if (!updating_values_3 && dirty & /*ls*/ 64) {
    				updating_values_3 = true;
    				rangeslider3_changes.values = /*ls*/ ctx[6];
    				add_flush_callback(() => updating_values_3 = false);
    			}

    			rangeslider3.$set(rangeslider3_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(rangeslider0.$$.fragment, local);
    			transition_in(room.$$.fragment, local);
    			transition_in(rangeslider1.$$.fragment, local);
    			transition_in(if_block);
    			transition_in(rangeslider2.$$.fragment, local);
    			transition_in(rangeslider3.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(rangeslider0.$$.fragment, local);
    			transition_out(room.$$.fragment, local);
    			transition_out(rangeslider1.$$.fragment, local);
    			transition_out(if_block);
    			transition_out(rangeslider2.$$.fragment, local);
    			transition_out(rangeslider3.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div20);
    			destroy_component(rangeslider0);
    			destroy_component(room);
    			destroy_component(rangeslider1);
    			if (if_block) if_block.d();
    			destroy_component(rangeslider2);
    			destroy_component(rangeslider3);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const MAX_W = 1200;
    const MAX_L = 1200;
    const MAX_H = 500;
    const func_3 = v => ("" + v).endsWith("50") ? "" : v / 100;

    function instance$a($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("CalculadoraDesktop", slots, []);
    	const vLabels = ["mala", "baja", "normal", "buena", "excelente"];
    	const vRen = [0.5, 1, 1.5, 3, 4];
    	let ws = [MAX_W - 600];
    	let ls = [900];
    	let hs = [MAX_H - 280];
    	let vs = [0];
    	let windowInfo = false;
    	let { w } = $$props;
    	let { l } = $$props;
    	let { h } = $$props;
    	let { vent } = $$props;
    	let { needCADR } = $$props;
    	const writable_props = ["w", "l", "h", "vent", "needCADR"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<CalculadoraDesktop> was created with unknown prop '${key}'`);
    	});

    	const func = v => ("" + v).endsWith("50") ? "" : (MAX_H - v) / 100;

    	function rangeslider0_values_binding(value) {
    		hs = value;
    		$$invalidate(7, hs);
    	}

    	const click_handler = () => $$invalidate(9, windowInfo = true);
    	const func_1 = v => vLabels[v];

    	function rangeslider1_values_binding(value) {
    		vs = value;
    		$$invalidate(8, vs);
    	}

    	const close_handler = () => $$invalidate(9, windowInfo = false);
    	const func_2 = v => ("" + v).endsWith("50") ? "" : (MAX_W - v) / 100;

    	function rangeslider2_values_binding(value) {
    		ws = value;
    		$$invalidate(5, ws);
    	}

    	function rangeslider3_values_binding(value) {
    		ls = value;
    		$$invalidate(6, ls);
    	}

    	$$self.$$set = $$props => {
    		if ("w" in $$props) $$invalidate(0, w = $$props.w);
    		if ("l" in $$props) $$invalidate(1, l = $$props.l);
    		if ("h" in $$props) $$invalidate(2, h = $$props.h);
    		if ("vent" in $$props) $$invalidate(3, vent = $$props.vent);
    		if ("needCADR" in $$props) $$invalidate(4, needCADR = $$props.needCADR);
    	};

    	$$self.$capture_state = () => ({
    		RangeSlider,
    		Room,
    		WindowInfo,
    		MAX_W,
    		MAX_L,
    		MAX_H,
    		vLabels,
    		vRen,
    		ws,
    		ls,
    		hs,
    		vs,
    		windowInfo,
    		w,
    		l,
    		h,
    		vent,
    		needCADR
    	});

    	$$self.$inject_state = $$props => {
    		if ("ws" in $$props) $$invalidate(5, ws = $$props.ws);
    		if ("ls" in $$props) $$invalidate(6, ls = $$props.ls);
    		if ("hs" in $$props) $$invalidate(7, hs = $$props.hs);
    		if ("vs" in $$props) $$invalidate(8, vs = $$props.vs);
    		if ("windowInfo" in $$props) $$invalidate(9, windowInfo = $$props.windowInfo);
    		if ("w" in $$props) $$invalidate(0, w = $$props.w);
    		if ("l" in $$props) $$invalidate(1, l = $$props.l);
    		if ("h" in $$props) $$invalidate(2, h = $$props.h);
    		if ("vent" in $$props) $$invalidate(3, vent = $$props.vent);
    		if ("needCADR" in $$props) $$invalidate(4, needCADR = $$props.needCADR);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*ws*/ 32) {
    			 $$invalidate(0, w = Math.max(0, MAX_W - ws[0]));
    		}

    		if ($$self.$$.dirty & /*ls*/ 64) {
    			 $$invalidate(1, l = ls[0]);
    		}

    		if ($$self.$$.dirty & /*hs*/ 128) {
    			 $$invalidate(2, h = Math.max(0, MAX_H - hs[0]));
    		}

    		if ($$self.$$.dirty & /*vs*/ 256) {
    			 $$invalidate(3, vent = vs[0]);
    		}

    		if ($$self.$$.dirty & /*vent, l, w, h*/ 15) {
    			 $$invalidate(4, needCADR = Math.round((5 - vRen[vent]) * (l / 100) * (w / 100) * (h / 100)));
    		}
    	};

    	return [
    		w,
    		l,
    		h,
    		vent,
    		needCADR,
    		ws,
    		ls,
    		hs,
    		vs,
    		windowInfo,
    		vLabels,
    		vRen,
    		func,
    		rangeslider0_values_binding,
    		click_handler,
    		func_1,
    		rangeslider1_values_binding,
    		close_handler,
    		func_2,
    		rangeslider2_values_binding,
    		rangeslider3_values_binding
    	];
    }

    class CalculadoraDesktop extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, { w: 0, l: 1, h: 2, vent: 3, needCADR: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CalculadoraDesktop",
    			options,
    			id: create_fragment$a.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*w*/ ctx[0] === undefined && !("w" in props)) {
    			console.warn("<CalculadoraDesktop> was created without expected prop 'w'");
    		}

    		if (/*l*/ ctx[1] === undefined && !("l" in props)) {
    			console.warn("<CalculadoraDesktop> was created without expected prop 'l'");
    		}

    		if (/*h*/ ctx[2] === undefined && !("h" in props)) {
    			console.warn("<CalculadoraDesktop> was created without expected prop 'h'");
    		}

    		if (/*vent*/ ctx[3] === undefined && !("vent" in props)) {
    			console.warn("<CalculadoraDesktop> was created without expected prop 'vent'");
    		}

    		if (/*needCADR*/ ctx[4] === undefined && !("needCADR" in props)) {
    			console.warn("<CalculadoraDesktop> was created without expected prop 'needCADR'");
    		}
    	}

    	get w() {
    		throw new Error("<CalculadoraDesktop>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set w(value) {
    		throw new Error("<CalculadoraDesktop>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get l() {
    		throw new Error("<CalculadoraDesktop>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set l(value) {
    		throw new Error("<CalculadoraDesktop>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get h() {
    		throw new Error("<CalculadoraDesktop>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set h(value) {
    		throw new Error("<CalculadoraDesktop>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get vent() {
    		throw new Error("<CalculadoraDesktop>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set vent(value) {
    		throw new Error("<CalculadoraDesktop>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get needCADR() {
    		throw new Error("<CalculadoraDesktop>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set needCADR(value) {
    		throw new Error("<CalculadoraDesktop>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/CalculadoraMobile.svelte generated by Svelte v3.29.7 */
    const file$b = "src/CalculadoraMobile.svelte";

    // (115:0) {#if windowInfo}
    function create_if_block$3(ctx) {
    	let div;
    	let windowinfo;
    	let current;
    	windowinfo = new WindowInfo({ $$inline: true });
    	windowinfo.$on("close", /*close_handler*/ ctx[18]);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(windowinfo.$$.fragment);
    			attr_dev(div, "class", "fixed overflow-y-scroll inset-0 bg-white p-6 md:p-12 z-10");
    			add_location(div, file$b, 115, 2, 2427);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(windowinfo, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(windowinfo.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(windowinfo.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(windowinfo);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(115:0) {#if windowInfo}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$b(ctx) {
    	let div12;
    	let div0;
    	let h1;
    	let t1;
    	let div1;
    	let t2;
    	let t3_value = /*l*/ ctx[1] / 100 + "";
    	let t3;
    	let t4;
    	let t5;
    	let div2;
    	let rangeslider0;
    	let updating_values;
    	let t6;
    	let div3;
    	let t7;
    	let t8_value = /*w*/ ctx[0] / 100 + "";
    	let t8;
    	let t9;
    	let t10;
    	let div4;
    	let rangeslider1;
    	let updating_values_1;
    	let t11;
    	let div5;
    	let room;
    	let t12;
    	let div6;
    	let t13;
    	let t14_value = /*h*/ ctx[2] / 100 + "";
    	let t14;
    	let t15;
    	let t16;
    	let div7;
    	let rangeslider2;
    	let updating_values_2;
    	let t17;
    	let div8;
    	let t18;
    	let t19_value = /*vRen*/ ctx[11][/*vent*/ ctx[3]] + "";
    	let t19;
    	let t20;
    	let button;
    	let t22;
    	let div10;
    	let div9;
    	let rangeslider3;
    	let updating_values_3;
    	let t23;
    	let div11;
    	let t24;
    	let t25;
    	let t26;
    	let t27;
    	let if_block_anchor;
    	let current;
    	let mounted;
    	let dispose;

    	function rangeslider0_values_binding(value) {
    		/*rangeslider0_values_binding*/ ctx[12].call(null, value);
    	}

    	let rangeslider0_props = {
    		step: 10,
    		min: 0,
    		max: MAX_L$1,
    		range: "min",
    		pips: true,
    		all: "label",
    		formatter: func,
    		pipstep: 5
    	};

    	if (/*ls*/ ctx[6] !== void 0) {
    		rangeslider0_props.values = /*ls*/ ctx[6];
    	}

    	rangeslider0 = new RangeSlider({
    			props: rangeslider0_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(rangeslider0, "values", rangeslider0_values_binding));

    	function rangeslider1_values_binding(value) {
    		/*rangeslider1_values_binding*/ ctx[13].call(null, value);
    	}

    	let rangeslider1_props = {
    		step: 10,
    		min: 0,
    		max: MAX_W$1,
    		range: "min",
    		pips: true,
    		all: "label",
    		formatter: func_1,
    		pipstep: 5
    	};

    	if (/*ws*/ ctx[5] !== void 0) {
    		rangeslider1_props.values = /*ws*/ ctx[5];
    	}

    	rangeslider1 = new RangeSlider({
    			props: rangeslider1_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(rangeslider1, "values", rangeslider1_values_binding));

    	room = new Room({
    			props: {
    				l: /*l*/ ctx[1],
    				w: /*w*/ ctx[0],
    				h: /*h*/ ctx[2],
    				vent: /*vent*/ ctx[3]
    			},
    			$$inline: true
    		});

    	function rangeslider2_values_binding(value) {
    		/*rangeslider2_values_binding*/ ctx[14].call(null, value);
    	}

    	let rangeslider2_props = {
    		step: 10,
    		min: 0,
    		max: MAX_H$1,
    		range: "min",
    		pips: true,
    		all: "label",
    		formatter: func_2,
    		pipstep: 5
    	};

    	if (/*hs*/ ctx[7] !== void 0) {
    		rangeslider2_props.values = /*hs*/ ctx[7];
    	}

    	rangeslider2 = new RangeSlider({
    			props: rangeslider2_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(rangeslider2, "values", rangeslider2_values_binding));

    	function rangeslider3_values_binding(value) {
    		/*rangeslider3_values_binding*/ ctx[17].call(null, value);
    	}

    	let rangeslider3_props = {
    		step: 1,
    		min: 0,
    		max: 4,
    		pips: true,
    		all: "label",
    		formatter: /*func_3*/ ctx[16]
    	};

    	if (/*vs*/ ctx[8] !== void 0) {
    		rangeslider3_props.values = /*vs*/ ctx[8];
    	}

    	rangeslider3 = new RangeSlider({
    			props: rangeslider3_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(rangeslider3, "values", rangeslider3_values_binding));
    	let if_block = /*windowInfo*/ ctx[9] && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			div12 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Calculadora de filtros HEPA";
    			t1 = space();
    			div1 = element("div");
    			t2 = text("largo ");
    			t3 = text(t3_value);
    			t4 = text(" m");
    			t5 = space();
    			div2 = element("div");
    			create_component(rangeslider0.$$.fragment);
    			t6 = space();
    			div3 = element("div");
    			t7 = text("ancho ");
    			t8 = text(t8_value);
    			t9 = text(" m");
    			t10 = space();
    			div4 = element("div");
    			create_component(rangeslider1.$$.fragment);
    			t11 = space();
    			div5 = element("div");
    			create_component(room.$$.fragment);
    			t12 = space();
    			div6 = element("div");
    			t13 = text("alto ");
    			t14 = text(t14_value);
    			t15 = text(" m");
    			t16 = space();
    			div7 = element("div");
    			create_component(rangeslider2.$$.fragment);
    			t17 = space();
    			div8 = element("div");
    			t18 = text("Ventilación existente ");
    			t19 = text(t19_value);
    			t20 = text(" renovaciones/h\n    ");
    			button = element("button");
    			button.textContent = "i";
    			t22 = space();
    			div10 = element("div");
    			div9 = element("div");
    			create_component(rangeslider3.$$.fragment);
    			t23 = space();
    			div11 = element("div");
    			t24 = text("CADR necesario: ");
    			t25 = text(/*needCADR*/ ctx[4]);
    			t26 = text(" m³/h");
    			t27 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			attr_dev(h1, "class", "text-center text-xl p-2 shadow");
    			add_location(h1, file$b, 36, 4, 742);
    			attr_dev(div0, "class", "bg-purple-800 text-white");
    			add_location(div0, file$b, 35, 2, 699);
    			attr_dev(div1, "class", "ml-3 pt-3");
    			add_location(div1, file$b, 39, 2, 830);
    			add_location(div2, file$b, 40, 2, 879);
    			attr_dev(div3, "class", "ml-3 pt-3");
    			add_location(div3, file$b, 53, 2, 1117);
    			add_location(div4, file$b, 54, 2, 1166);
    			set_style(div5, "height", "80vw");
    			add_location(div5, file$b, 67, 2, 1404);
    			attr_dev(div6, "class", "ml-3 pt-3");
    			add_location(div6, file$b, 71, 2, 1475);
    			add_location(div7, file$b, 72, 2, 1523);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", " rounded-full bg-blue-500 text-white font-bold w-6 h-6 ml-3 shadow\n      hover:bg-blue-400");
    			add_location(button, file$b, 87, 4, 1843);
    			attr_dev(div8, "class", "ml-3 pt-3");
    			add_location(div8, file$b, 85, 2, 1761);
    			attr_dev(div9, "class", "flex-1");
    			add_location(div9, file$b, 96, 4, 2076);
    			attr_dev(div10, "class", "flex");
    			add_location(div10, file$b, 95, 2, 2053);
    			attr_dev(div11, "class", "text-xl bg-purple-700 text-white text-center py-6 mt-4");
    			add_location(div11, file$b, 108, 2, 2285);
    			attr_dev(div12, "class", "w-full");
    			add_location(div12, file$b, 34, 0, 676);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div12, anchor);
    			append_dev(div12, div0);
    			append_dev(div0, h1);
    			append_dev(div12, t1);
    			append_dev(div12, div1);
    			append_dev(div1, t2);
    			append_dev(div1, t3);
    			append_dev(div1, t4);
    			append_dev(div12, t5);
    			append_dev(div12, div2);
    			mount_component(rangeslider0, div2, null);
    			append_dev(div12, t6);
    			append_dev(div12, div3);
    			append_dev(div3, t7);
    			append_dev(div3, t8);
    			append_dev(div3, t9);
    			append_dev(div12, t10);
    			append_dev(div12, div4);
    			mount_component(rangeslider1, div4, null);
    			append_dev(div12, t11);
    			append_dev(div12, div5);
    			mount_component(room, div5, null);
    			append_dev(div12, t12);
    			append_dev(div12, div6);
    			append_dev(div6, t13);
    			append_dev(div6, t14);
    			append_dev(div6, t15);
    			append_dev(div12, t16);
    			append_dev(div12, div7);
    			mount_component(rangeslider2, div7, null);
    			append_dev(div12, t17);
    			append_dev(div12, div8);
    			append_dev(div8, t18);
    			append_dev(div8, t19);
    			append_dev(div8, t20);
    			append_dev(div8, button);
    			append_dev(div12, t22);
    			append_dev(div12, div10);
    			append_dev(div10, div9);
    			mount_component(rangeslider3, div9, null);
    			append_dev(div12, t23);
    			append_dev(div12, div11);
    			append_dev(div11, t24);
    			append_dev(div11, t25);
    			append_dev(div11, t26);
    			insert_dev(target, t27, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[15], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if ((!current || dirty & /*l*/ 2) && t3_value !== (t3_value = /*l*/ ctx[1] / 100 + "")) set_data_dev(t3, t3_value);
    			const rangeslider0_changes = {};

    			if (!updating_values && dirty & /*ls*/ 64) {
    				updating_values = true;
    				rangeslider0_changes.values = /*ls*/ ctx[6];
    				add_flush_callback(() => updating_values = false);
    			}

    			rangeslider0.$set(rangeslider0_changes);
    			if ((!current || dirty & /*w*/ 1) && t8_value !== (t8_value = /*w*/ ctx[0] / 100 + "")) set_data_dev(t8, t8_value);
    			const rangeslider1_changes = {};

    			if (!updating_values_1 && dirty & /*ws*/ 32) {
    				updating_values_1 = true;
    				rangeslider1_changes.values = /*ws*/ ctx[5];
    				add_flush_callback(() => updating_values_1 = false);
    			}

    			rangeslider1.$set(rangeslider1_changes);
    			const room_changes = {};
    			if (dirty & /*l*/ 2) room_changes.l = /*l*/ ctx[1];
    			if (dirty & /*w*/ 1) room_changes.w = /*w*/ ctx[0];
    			if (dirty & /*h*/ 4) room_changes.h = /*h*/ ctx[2];
    			if (dirty & /*vent*/ 8) room_changes.vent = /*vent*/ ctx[3];
    			room.$set(room_changes);
    			if ((!current || dirty & /*h*/ 4) && t14_value !== (t14_value = /*h*/ ctx[2] / 100 + "")) set_data_dev(t14, t14_value);
    			const rangeslider2_changes = {};

    			if (!updating_values_2 && dirty & /*hs*/ 128) {
    				updating_values_2 = true;
    				rangeslider2_changes.values = /*hs*/ ctx[7];
    				add_flush_callback(() => updating_values_2 = false);
    			}

    			rangeslider2.$set(rangeslider2_changes);
    			if ((!current || dirty & /*vent*/ 8) && t19_value !== (t19_value = /*vRen*/ ctx[11][/*vent*/ ctx[3]] + "")) set_data_dev(t19, t19_value);
    			const rangeslider3_changes = {};

    			if (!updating_values_3 && dirty & /*vs*/ 256) {
    				updating_values_3 = true;
    				rangeslider3_changes.values = /*vs*/ ctx[8];
    				add_flush_callback(() => updating_values_3 = false);
    			}

    			rangeslider3.$set(rangeslider3_changes);
    			if (!current || dirty & /*needCADR*/ 16) set_data_dev(t25, /*needCADR*/ ctx[4]);

    			if (/*windowInfo*/ ctx[9]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*windowInfo*/ 512) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(rangeslider0.$$.fragment, local);
    			transition_in(rangeslider1.$$.fragment, local);
    			transition_in(room.$$.fragment, local);
    			transition_in(rangeslider2.$$.fragment, local);
    			transition_in(rangeslider3.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(rangeslider0.$$.fragment, local);
    			transition_out(rangeslider1.$$.fragment, local);
    			transition_out(room.$$.fragment, local);
    			transition_out(rangeslider2.$$.fragment, local);
    			transition_out(rangeslider3.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div12);
    			destroy_component(rangeslider0);
    			destroy_component(rangeslider1);
    			destroy_component(room);
    			destroy_component(rangeslider2);
    			destroy_component(rangeslider3);
    			if (detaching) detach_dev(t27);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const MAX_W$1 = 1200;
    const MAX_L$1 = 1200;
    const MAX_H$1 = 500;
    const func = v => ("" + v).endsWith("50") ? "" : v / 100;
    const func_1 = v => ("" + v).endsWith("50") ? "" : v / 100;
    const func_2 = v => ("" + v).endsWith("50") ? "" : v / 100;

    function instance$b($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("CalculadoraMobile", slots, []);
    	const vLabels = ["mala", "baja", "normal", "buena", "excelente"];
    	const vRen = [0.5, 1, 1.5, 3, 4];
    	let ws = [600];
    	let ls = [900];
    	let hs = [280];
    	let vs = [0];
    	let { w } = $$props;
    	let { l } = $$props;
    	let { h } = $$props;
    	let { vent } = $$props;
    	let { needCADR } = $$props;
    	let windowInfo = false;
    	const writable_props = ["w", "l", "h", "vent", "needCADR"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<CalculadoraMobile> was created with unknown prop '${key}'`);
    	});

    	function rangeslider0_values_binding(value) {
    		ls = value;
    		$$invalidate(6, ls);
    	}

    	function rangeslider1_values_binding(value) {
    		ws = value;
    		$$invalidate(5, ws);
    	}

    	function rangeslider2_values_binding(value) {
    		hs = value;
    		$$invalidate(7, hs);
    	}

    	const click_handler = () => $$invalidate(9, windowInfo = true);
    	const func_3 = v => vLabels[v];

    	function rangeslider3_values_binding(value) {
    		vs = value;
    		$$invalidate(8, vs);
    	}

    	const close_handler = () => $$invalidate(9, windowInfo = false);

    	$$self.$$set = $$props => {
    		if ("w" in $$props) $$invalidate(0, w = $$props.w);
    		if ("l" in $$props) $$invalidate(1, l = $$props.l);
    		if ("h" in $$props) $$invalidate(2, h = $$props.h);
    		if ("vent" in $$props) $$invalidate(3, vent = $$props.vent);
    		if ("needCADR" in $$props) $$invalidate(4, needCADR = $$props.needCADR);
    	};

    	$$self.$capture_state = () => ({
    		RangeSlider,
    		Room,
    		WindowInfo,
    		MAX_W: MAX_W$1,
    		MAX_L: MAX_L$1,
    		MAX_H: MAX_H$1,
    		vLabels,
    		vRen,
    		ws,
    		ls,
    		hs,
    		vs,
    		w,
    		l,
    		h,
    		vent,
    		needCADR,
    		windowInfo
    	});

    	$$self.$inject_state = $$props => {
    		if ("ws" in $$props) $$invalidate(5, ws = $$props.ws);
    		if ("ls" in $$props) $$invalidate(6, ls = $$props.ls);
    		if ("hs" in $$props) $$invalidate(7, hs = $$props.hs);
    		if ("vs" in $$props) $$invalidate(8, vs = $$props.vs);
    		if ("w" in $$props) $$invalidate(0, w = $$props.w);
    		if ("l" in $$props) $$invalidate(1, l = $$props.l);
    		if ("h" in $$props) $$invalidate(2, h = $$props.h);
    		if ("vent" in $$props) $$invalidate(3, vent = $$props.vent);
    		if ("needCADR" in $$props) $$invalidate(4, needCADR = $$props.needCADR);
    		if ("windowInfo" in $$props) $$invalidate(9, windowInfo = $$props.windowInfo);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*ws*/ 32) {
    			 $$invalidate(0, w = ws[0]);
    		}

    		if ($$self.$$.dirty & /*ls*/ 64) {
    			 $$invalidate(1, l = ls[0]);
    		}

    		if ($$self.$$.dirty & /*hs*/ 128) {
    			 $$invalidate(2, h = hs[0]);
    		}

    		if ($$self.$$.dirty & /*vs*/ 256) {
    			 $$invalidate(3, vent = vs[0]);
    		}

    		if ($$self.$$.dirty & /*vent, l, w, h*/ 15) {
    			 $$invalidate(4, needCADR = Math.round((5 - vRen[vent]) * (l / 100) * (w / 100) * (h / 100)));
    		}
    	};

    	return [
    		w,
    		l,
    		h,
    		vent,
    		needCADR,
    		ws,
    		ls,
    		hs,
    		vs,
    		windowInfo,
    		vLabels,
    		vRen,
    		rangeslider0_values_binding,
    		rangeslider1_values_binding,
    		rangeslider2_values_binding,
    		click_handler,
    		func_3,
    		rangeslider3_values_binding,
    		close_handler
    	];
    }

    class CalculadoraMobile extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, { w: 0, l: 1, h: 2, vent: 3, needCADR: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CalculadoraMobile",
    			options,
    			id: create_fragment$b.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*w*/ ctx[0] === undefined && !("w" in props)) {
    			console.warn("<CalculadoraMobile> was created without expected prop 'w'");
    		}

    		if (/*l*/ ctx[1] === undefined && !("l" in props)) {
    			console.warn("<CalculadoraMobile> was created without expected prop 'l'");
    		}

    		if (/*h*/ ctx[2] === undefined && !("h" in props)) {
    			console.warn("<CalculadoraMobile> was created without expected prop 'h'");
    		}

    		if (/*vent*/ ctx[3] === undefined && !("vent" in props)) {
    			console.warn("<CalculadoraMobile> was created without expected prop 'vent'");
    		}

    		if (/*needCADR*/ ctx[4] === undefined && !("needCADR" in props)) {
    			console.warn("<CalculadoraMobile> was created without expected prop 'needCADR'");
    		}
    	}

    	get w() {
    		throw new Error("<CalculadoraMobile>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set w(value) {
    		throw new Error("<CalculadoraMobile>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get l() {
    		throw new Error("<CalculadoraMobile>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set l(value) {
    		throw new Error("<CalculadoraMobile>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get h() {
    		throw new Error("<CalculadoraMobile>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set h(value) {
    		throw new Error("<CalculadoraMobile>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get vent() {
    		throw new Error("<CalculadoraMobile>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set vent(value) {
    		throw new Error("<CalculadoraMobile>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get needCADR() {
    		throw new Error("<CalculadoraMobile>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set needCADR(value) {
    		throw new Error("<CalculadoraMobile>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.29.7 */

    const { window: window_1 } = globals;

    // (96:0) {:else}
    function create_else_block(ctx) {
    	let calculadoradesktop;
    	let updating_l;
    	let updating_w;
    	let updating_h;
    	let updating_vent;
    	let updating_needCADR;
    	let current;

    	function calculadoradesktop_l_binding(value) {
    		/*calculadoradesktop_l_binding*/ ctx[13].call(null, value);
    	}

    	function calculadoradesktop_w_binding(value) {
    		/*calculadoradesktop_w_binding*/ ctx[14].call(null, value);
    	}

    	function calculadoradesktop_h_binding(value) {
    		/*calculadoradesktop_h_binding*/ ctx[15].call(null, value);
    	}

    	function calculadoradesktop_vent_binding(value) {
    		/*calculadoradesktop_vent_binding*/ ctx[16].call(null, value);
    	}

    	function calculadoradesktop_needCADR_binding(value) {
    		/*calculadoradesktop_needCADR_binding*/ ctx[17].call(null, value);
    	}

    	let calculadoradesktop_props = {};

    	if (/*l*/ ctx[2] !== void 0) {
    		calculadoradesktop_props.l = /*l*/ ctx[2];
    	}

    	if (/*w*/ ctx[1] !== void 0) {
    		calculadoradesktop_props.w = /*w*/ ctx[1];
    	}

    	if (/*h*/ ctx[3] !== void 0) {
    		calculadoradesktop_props.h = /*h*/ ctx[3];
    	}

    	if (/*vent*/ ctx[4] !== void 0) {
    		calculadoradesktop_props.vent = /*vent*/ ctx[4];
    	}

    	if (/*needCADR*/ ctx[5] !== void 0) {
    		calculadoradesktop_props.needCADR = /*needCADR*/ ctx[5];
    	}

    	calculadoradesktop = new CalculadoraDesktop({
    			props: calculadoradesktop_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(calculadoradesktop, "l", calculadoradesktop_l_binding));
    	binding_callbacks.push(() => bind(calculadoradesktop, "w", calculadoradesktop_w_binding));
    	binding_callbacks.push(() => bind(calculadoradesktop, "h", calculadoradesktop_h_binding));
    	binding_callbacks.push(() => bind(calculadoradesktop, "vent", calculadoradesktop_vent_binding));
    	binding_callbacks.push(() => bind(calculadoradesktop, "needCADR", calculadoradesktop_needCADR_binding));

    	const block = {
    		c: function create() {
    			create_component(calculadoradesktop.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(calculadoradesktop, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const calculadoradesktop_changes = {};

    			if (!updating_l && dirty & /*l*/ 4) {
    				updating_l = true;
    				calculadoradesktop_changes.l = /*l*/ ctx[2];
    				add_flush_callback(() => updating_l = false);
    			}

    			if (!updating_w && dirty & /*w*/ 2) {
    				updating_w = true;
    				calculadoradesktop_changes.w = /*w*/ ctx[1];
    				add_flush_callback(() => updating_w = false);
    			}

    			if (!updating_h && dirty & /*h*/ 8) {
    				updating_h = true;
    				calculadoradesktop_changes.h = /*h*/ ctx[3];
    				add_flush_callback(() => updating_h = false);
    			}

    			if (!updating_vent && dirty & /*vent*/ 16) {
    				updating_vent = true;
    				calculadoradesktop_changes.vent = /*vent*/ ctx[4];
    				add_flush_callback(() => updating_vent = false);
    			}

    			if (!updating_needCADR && dirty & /*needCADR*/ 32) {
    				updating_needCADR = true;
    				calculadoradesktop_changes.needCADR = /*needCADR*/ ctx[5];
    				add_flush_callback(() => updating_needCADR = false);
    			}

    			calculadoradesktop.$set(calculadoradesktop_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(calculadoradesktop.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(calculadoradesktop.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(calculadoradesktop, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(96:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (94:0) {#if mobile}
    function create_if_block$4(ctx) {
    	let calculadoramobile;
    	let updating_l;
    	let updating_w;
    	let updating_h;
    	let updating_vent;
    	let updating_needCADR;
    	let current;

    	function calculadoramobile_l_binding(value) {
    		/*calculadoramobile_l_binding*/ ctx[8].call(null, value);
    	}

    	function calculadoramobile_w_binding(value) {
    		/*calculadoramobile_w_binding*/ ctx[9].call(null, value);
    	}

    	function calculadoramobile_h_binding(value) {
    		/*calculadoramobile_h_binding*/ ctx[10].call(null, value);
    	}

    	function calculadoramobile_vent_binding(value) {
    		/*calculadoramobile_vent_binding*/ ctx[11].call(null, value);
    	}

    	function calculadoramobile_needCADR_binding(value) {
    		/*calculadoramobile_needCADR_binding*/ ctx[12].call(null, value);
    	}

    	let calculadoramobile_props = {};

    	if (/*l*/ ctx[2] !== void 0) {
    		calculadoramobile_props.l = /*l*/ ctx[2];
    	}

    	if (/*w*/ ctx[1] !== void 0) {
    		calculadoramobile_props.w = /*w*/ ctx[1];
    	}

    	if (/*h*/ ctx[3] !== void 0) {
    		calculadoramobile_props.h = /*h*/ ctx[3];
    	}

    	if (/*vent*/ ctx[4] !== void 0) {
    		calculadoramobile_props.vent = /*vent*/ ctx[4];
    	}

    	if (/*needCADR*/ ctx[5] !== void 0) {
    		calculadoramobile_props.needCADR = /*needCADR*/ ctx[5];
    	}

    	calculadoramobile = new CalculadoraMobile({
    			props: calculadoramobile_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(calculadoramobile, "l", calculadoramobile_l_binding));
    	binding_callbacks.push(() => bind(calculadoramobile, "w", calculadoramobile_w_binding));
    	binding_callbacks.push(() => bind(calculadoramobile, "h", calculadoramobile_h_binding));
    	binding_callbacks.push(() => bind(calculadoramobile, "vent", calculadoramobile_vent_binding));
    	binding_callbacks.push(() => bind(calculadoramobile, "needCADR", calculadoramobile_needCADR_binding));

    	const block = {
    		c: function create() {
    			create_component(calculadoramobile.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(calculadoramobile, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const calculadoramobile_changes = {};

    			if (!updating_l && dirty & /*l*/ 4) {
    				updating_l = true;
    				calculadoramobile_changes.l = /*l*/ ctx[2];
    				add_flush_callback(() => updating_l = false);
    			}

    			if (!updating_w && dirty & /*w*/ 2) {
    				updating_w = true;
    				calculadoramobile_changes.w = /*w*/ ctx[1];
    				add_flush_callback(() => updating_w = false);
    			}

    			if (!updating_h && dirty & /*h*/ 8) {
    				updating_h = true;
    				calculadoramobile_changes.h = /*h*/ ctx[3];
    				add_flush_callback(() => updating_h = false);
    			}

    			if (!updating_vent && dirty & /*vent*/ 16) {
    				updating_vent = true;
    				calculadoramobile_changes.vent = /*vent*/ ctx[4];
    				add_flush_callback(() => updating_vent = false);
    			}

    			if (!updating_needCADR && dirty & /*needCADR*/ 32) {
    				updating_needCADR = true;
    				calculadoramobile_changes.needCADR = /*needCADR*/ ctx[5];
    				add_flush_callback(() => updating_needCADR = false);
    			}

    			calculadoramobile.$set(calculadoramobile_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(calculadoramobile.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(calculadoramobile.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(calculadoramobile, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(94:0) {#if mobile}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$c(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let t;
    	let producttable;
    	let current;
    	let mounted;
    	let dispose;
    	const if_block_creators = [create_if_block$4, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*mobile*/ ctx[0]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	producttable = new ProductTable({
    			props: {
    				products: /*products*/ ctx[6],
    				needCADR: /*needCADR*/ ctx[5]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			if_block.c();
    			t = space();
    			create_component(producttable.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(producttable, target, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(window_1, "resize", /*size*/ ctx[7], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(t.parentNode, t);
    			}

    			const producttable_changes = {};
    			if (dirty & /*needCADR*/ 32) producttable_changes.needCADR = /*needCADR*/ ctx[5];
    			producttable.$set(producttable_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(producttable.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			transition_out(producttable.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(producttable, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const MAX_W$2 = 1200;
    const MAX_L$2 = 1200;
    const MAX_H$2 = 500;

    function instance$c($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const vLabels = ["mala", "baja", "normal", "buena", "excelente"];
    	const vRen = [0.5, 1, 1.5, 3, 4];
    	let mobile = true;
    	let w;
    	let l;
    	let h;
    	let vent;
    	let needCADR;

    	const products = [
    		{
    			name: "Inventor Quality QLT-700",
    			price: 449.99,
    			filter: "HEPA H13",
    			CADR: 700,
    			db: 54,
    			ASIN: "B081568TVM"
    		},
    		{
    			name: "Inventor Quality QLT-550",
    			price: 420,
    			filter: "HEPA H13",
    			CADR: 550,
    			db: 54,
    			ASIN: "B08155YBQH"
    		},
    		{
    			name: "Inventor Quality QLT-700",
    			price: 449.99,
    			filter: "HEPA H13",
    			CADR: 700,
    			db: 54,
    			ASIN: "B081568TVM"
    		},
    		{
    			name: "Inventor Quality QLT-550",
    			price: 420,
    			filter: "HEPA H13",
    			CADR: 550,
    			db: 54,
    			ASIN: "B08155YBQH"
    		},
    		{
    			name: "Inventor Quality QLT-700",
    			price: 449.99,
    			filter: "HEPA H13",
    			CADR: 700,
    			db: 54,
    			ASIN: "B081568TVM"
    		},
    		{
    			name: "Inventor Quality QLT-550",
    			price: 420,
    			filter: "HEPA H13",
    			CADR: 550,
    			db: 54,
    			ASIN: "B08155YBQH"
    		}
    	];

    	function size() {
    		$$invalidate(0, mobile = window.innerHeight >= window.innerWidth || window.innerHeight <= 640);
    	}

    	onMount(size);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function calculadoramobile_l_binding(value) {
    		l = value;
    		$$invalidate(2, l);
    	}

    	function calculadoramobile_w_binding(value) {
    		w = value;
    		$$invalidate(1, w);
    	}

    	function calculadoramobile_h_binding(value) {
    		h = value;
    		$$invalidate(3, h);
    	}

    	function calculadoramobile_vent_binding(value) {
    		vent = value;
    		$$invalidate(4, vent);
    	}

    	function calculadoramobile_needCADR_binding(value) {
    		needCADR = value;
    		$$invalidate(5, needCADR);
    	}

    	function calculadoradesktop_l_binding(value) {
    		l = value;
    		$$invalidate(2, l);
    	}

    	function calculadoradesktop_w_binding(value) {
    		w = value;
    		$$invalidate(1, w);
    	}

    	function calculadoradesktop_h_binding(value) {
    		h = value;
    		$$invalidate(3, h);
    	}

    	function calculadoradesktop_vent_binding(value) {
    		vent = value;
    		$$invalidate(4, vent);
    	}

    	function calculadoradesktop_needCADR_binding(value) {
    		needCADR = value;
    		$$invalidate(5, needCADR);
    	}

    	$$self.$capture_state = () => ({
    		ProductTable,
    		CalculadoraDesktop,
    		CalculadoraMobile,
    		RangeSlider,
    		onMount,
    		MAX_W: MAX_W$2,
    		MAX_L: MAX_L$2,
    		MAX_H: MAX_H$2,
    		vLabels,
    		vRen,
    		mobile,
    		w,
    		l,
    		h,
    		vent,
    		needCADR,
    		products,
    		size
    	});

    	$$self.$inject_state = $$props => {
    		if ("mobile" in $$props) $$invalidate(0, mobile = $$props.mobile);
    		if ("w" in $$props) $$invalidate(1, w = $$props.w);
    		if ("l" in $$props) $$invalidate(2, l = $$props.l);
    		if ("h" in $$props) $$invalidate(3, h = $$props.h);
    		if ("vent" in $$props) $$invalidate(4, vent = $$props.vent);
    		if ("needCADR" in $$props) $$invalidate(5, needCADR = $$props.needCADR);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		mobile,
    		w,
    		l,
    		h,
    		vent,
    		needCADR,
    		products,
    		size,
    		calculadoramobile_l_binding,
    		calculadoramobile_w_binding,
    		calculadoramobile_h_binding,
    		calculadoramobile_vent_binding,
    		calculadoramobile_needCADR_binding,
    		calculadoradesktop_l_binding,
    		calculadoradesktop_w_binding,
    		calculadoradesktop_h_binding,
    		calculadoradesktop_vent_binding,
    		calculadoradesktop_needCADR_binding
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$c.name
    		});
    	}
    }

    const app = new App({
      target: document.body,
      props: {
        name: 'world',
      },
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
