<script>
    let myTodo = getTodo();
    export let name;

    async function getTodo() {
        const response = await fetch("/todos/1");
        const todo = await response.json();

        if (response.ok) {
            return todo;
        } else {
            throw new Error(todo);
        }
    }

    async function postTodo(myPost) {
        fetch('/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(myPost)
        })
                .then((res) => res.json())
                .then((data) => console.log(data));
    }
</script>

<main>

{#await myTodo}
    <p>...waiting</p>
{:then todo_1}
    <p>{todo_1.title}</p>
{:catch error}
    <p style="color: red">{error.message}</p>
{/await}

    <h1>Hello {name}!</h1>
</main>

<style>
    main {
        text-align: center;
        padding: 1em;
        max-width: 240px;
        margin: 0 auto;
    }

    h1 {
        color: #ff3e00;
        font-size: 4em;
        font-weight: 100;
    }
</style>