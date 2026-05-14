/* https://gemini.google.com/share/9777aa23e31a */
/* https://gemini.google.com/share/af1fa6828e18 */

export async function onRequestPost(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    try {
        const formData = await request.formData();
        const name = formData.get('name');
        const email = formData.get('email'); // The user's email from the form
        const message = formData.get('message');
        const turnstileResponse = formData.get('cf-turnstile-response');

        // 1. Validate Turnstile
        const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body: `secret=${env.TURNSTILE_SECRET_KEY}&response=${turnstileResponse}`,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const outcome = await verifyRes.json();
        if (!outcome.success) {
            return new Response("Security verification failed. Please try again.", { status: 403 });
        }

        // 2. Dispatch via Resend API
        // This replaces the non-functional env.EMAIL.send binding
        const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${env.RESEND_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                // Once you verify promptuniversity.info in Resend, you can use any @ address there
                from: "Contact Form <contact@promptuniversity.info>",
                to: [env.MY_PRIVATE_EMAIL],
                reply_to: email,
                subject: `New Website Inquiry from ${name}`,
                text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
            }),
        });

        if (!emailResponse.ok) {
            const errorDetail = await emailResponse.text();
            throw new Error(`Resend API failed: ${errorDetail}`);
        }

        // 3. Promote the user to the "Thank You" page
        return Response.redirect(`${url.origin}/thanks.html`, 303);

    } catch (err) {
        console.error("Mail Error:", err.message);
        return new Response(`Server Error: Unable to process request.`, { status: 500 });
    }
}
