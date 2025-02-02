## SpecStory

## First Time API Key Entry Instructions (2/3/2025, 4:15:07 AM)

_**User**_

i want to add steps in when user first time enter interval api key:

Go to Intervals and log into your account
Navigate to My Account 
API Access under Options
Generate or view your API token (11-character code like: a78828gq6t4) or regenerate your API token 
Copy and paste your token below

---

_**Assistant**_

I'll help you add these steps to guide users when they're entering their Intervals API key for the first time. Let me check the relevant file first.

---

_**Assistant**_



---

_**Assistant**_



I'll modify the modal to include the detailed steps you provided for getting the API key. I'll update the instructions in the dialog description to make it clearer for first-time users.

---

_**Assistant**_

```
// ... existing code ...
          <DialogDescription asChild>
            <div className="space-y-3">
              <div className="text-destructive font-medium">
                An API key is required to use this application.
              </div>
              <div className="mt-2 space-y-3 rounded-md bg-muted p-4 text-sm">
                <div className="space-y-2">
                  <p className="font-medium">Follow these steps to get your API key:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-1">
                    <li>Go to Intervals and log into your account</li>
                    <li>Navigate to My Account</li>
                    <li>Find API Access under Options</li>
                    <li>Generate or view your API token (11-character code like: a78828gq6t4) or regenerate your API token</li>
                    <li>Copy and paste your token below</li>
                  </ol>
                  <p className="mt-3">
                    Get your API key from{" "}
                    <a 
                      href="https://nathcorp1.intervalsonline.com/account/api/" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary hover:underline font-medium"
                    >
                      Intervals API Access Page
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </DialogDescription>
// ... existing code ...
```

---

_**Assistant**_



I've updated the Intervals API key modal to include the detailed steps you requested. The changes include:

1. Added a clear numbered list of steps
2. Formatted the instructions in a more readable way with proper spacing and styling
3. Kept the direct link to the Intervals API Access Page
4. Added an example of what the API token looks like (11-character code)

The instructions are now displayed in a clean, organized manner within the existing modal, making it much clearer for first-time users to understand how to obtain their API key.

The modal will show these instructions whenever a user needs to enter their API key, whether it's their first time or if they need to update their key. Would you like me to make any adjustments to the formatting or wording of these instructions?

---

_**User**_

add Or in middle of both upper part is step and hyperlink is direct link

---

_**Assistant**_

I'll help you add a clear "OR" separator between the steps and the direct link to make the two options more distinct.

---

_**Assistant**_

```
// ... existing code ...
                    <li>Copy and paste your token below</li>
                  </ol>
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-muted-foreground/20"></span>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-muted px-2 text-muted-foreground font-semibold">OR</span>
                    </div>
                  </div>
                  <p>
                    Get your API key directly from{" "}
                    <a 
// ... existing code ...
```

---

_**Assistant**_



I've updated the modal to include a visually distinct "OR" separator between the step-by-step instructions and the direct link. The changes include:

1. Added a horizontal line with "OR" centered in the middle
2. Improved the spacing between the sections
3. Updated the text to say "Get your API key directly from" to make it clearer
4. Styled the separator with a clean, modern look that matches the modal's design

The separator uses a horizontal line with the word "OR" centered on top of it, which is a common UI pattern that makes the two options very clear to users. Would you like me to make any adjustments to the styling or wording?

---



---

