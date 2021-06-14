<script>
  import { Route, router } from 'tinro'
  // import Select from 'svelte-select'

  // let items = [
  //   { value: 'chocolate', label: 'Chocolate' },
  //   { value: 'pizza', label: 'Pizza' },
  //   { value: 'cake', label: 'Cake' },
  //   { value: 'chips', label: 'Chips' },
  //   { value: 'ice-cream', label: 'Ice Cream' },
  // ]

  // let selectedValue = { value: 'cake', label: 'Cake' }

  // function handleSelect(event) {
  //   console.log('selected item', event.detail)
  //   // .. do something here 🙂
  // }
</script>

{JSON.stringify($router)}
<nav>
  <a href="/foo">To foo</a>
  <a href="/bar">To bar</a>
  <button on:click={() => router.goto('/bar')}>Go bar</button>
</nav>

<!-- <Select {items} {selectedValue} on:select={handleSelect} /> -->

<Route path="/foo">Foo</Route>
<Route path="/bar">Bar</Route>
<Route fallback>Fallback</Route>
