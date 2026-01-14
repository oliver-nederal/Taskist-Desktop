import { useState } from "react";
import WelcomeGIF from "./Welcome.gif"; // Uncomment when you have the asset

function Onboarding() {
    const [screen, setScreen] = useState<number>(1);

    // --- Design System & Utilities ---

    const handleScreenChange = (newScreen: number): void => {
        if (newScreen >= 1 && newScreen <= 4) setScreen(newScreen);
    };

    // Reusable Icons (SVG) to replace emojis for a cleaner look
    const Icons = {
        ArrowRight: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>,
        Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
        Cloud: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19c0-3.037-2.463-5.5-5.5-5.5S6.5 15.963 6.5 19"/><path d="M4 19c0-5.523 4.477-10 10-10s10 4.477 10 10"/><path d="M12 2v8"/><path d="m16 6-4-4-4 4"/></svg>,
        Server: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>,
        Lock: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    };

    // Styles
    const styles = {
        // Main Container:
        // - Mobile: Blocks scrolling on the body (we scroll inside the card)
        // - Desktop: Flex centers the card
        mainContainer: "fixed z-30 inset-0 w-screen h-screen flex flex-col items-start md:items-center md:justify-center bg-gradient-to-br from-gray-50 to-gray-200 text-gray-800 font-sans selection:bg-blue-100 overflow-hidden",

        // Content Card:
        // - Mobile: Fills screen (w-full h-full), smaller padding (p-4), enables scrolling (overflow-y-auto), removes radius/border for full immersion.
        // - Desktop: Floating card (rounded-3xl), larger padding (p-8), locks scroll (overflow-hidden) to keep the "app" feel.
        contentCard: "relative w-full h-full lg:w-full lg:max-w-5xl lg:h-[700px] lg:max-h-[85vh] bg-white/60 backdrop-blur-2xl lg:rounded-3xl shadow-none lg:shadow-2xl border-0 lg:border border-white/50 flex flex-col items-center lg:justify-center p-4 pt-10 lg:p-8 overflow-y-auto lg:overflow-hidden transition-all duration-500 scrollbar-hide",

        // Typography
        h1: "text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-4",
        p: "text-lg text-gray-600 font-medium leading-relaxed max-w-md mx-auto mb-8",

        // Buttons
        btnPrimary: "group flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5",
        btnSecondary: "text-gray-500 hover:text-gray-900 font-medium px-6 py-2 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer",

        // Bento Grid Tiles
        bentoTile: "rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 border border-white/40 bg-white/40 hover:bg-white/60 hover:shadow-lg backdrop-blur-sm",
        bentoActionTile: "rounded-2xl p-6 flex items-center justify-center cursor-pointer bg-blue-600 text-white shadow-xl hover:bg-blue-700 hover:scale-[1.02] transition-all duration-300",
    };

    // --- Components for Specific Screens ---

    const ProgressBar = ({ current }: { current: number }) => (
        <div className="absolute bottom-8 flex gap-3">
            {[1, 2, 3, 4].map((num) => (
                <button
                    key={num}
                    onClick={() => handleScreenChange(num)}
                    className={`h-2 rounded-full transition-all duration-500 ${
                        num === current ? "w-8 bg-blue-600" : "w-2 bg-gray-300 hover:bg-gray-400"
                    }`}
                    aria-label={`Step ${num}`}
                />
            ))}
        </div>
    );

    // --- Screen 1: Welcome ---
    const Screen1 = () => (
        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
            <img src={WelcomeGIF} alt="Welcome" className="h-24 sm:h-32 mx-auto mb-10" />

            <p className={styles.p}>
                The open-source workspace that respects your data and your focus.
            </p>

            <div className="flex flex-col items-center gap-4">
                <button className={styles.btnPrimary} onClick={() => handleScreenChange(2)}>
                    Get Started <Icons.ArrowRight />
                </button>
                <button className="text-sm text-gray-400 hover:text-blue-600 font-medium underline underline-offset-4">
                    Restore from Backup
                </button>
            </div>
        </div>
    );

    // --- Screen 2: Features (The Bento Box) ---
    const Screen2 = () => (
        <div className="w-full h-full p-2 md:p-6 animate-in slide-in-from-right-8 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-4 md:grid-rows-3 gap-4 h-full">

                {/* Hero Tile */}
                <div className={`${styles.bentoTile} col-span-1 md:col-span-2 row-span-2 bg-linear-to-br! from-white/80 to-blue-50/50`}>
                    <div className="bg-blue-100 w-10 h-10 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                        <Icons.Check />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">Easy</h3>
                        <p className="text-gray-500 text-sm leading-relaxed">Designed to get out of your way. Capture tasks instantly with global shortcuts and smart parsing.</p>
                    </div>
                </div>

                {/* Stats / Rust Tile */}
                <div className={`${styles.bentoTile} col-span-1 row-span-1 items-center justify-center text-center`}>
                    <span className="text-3xl font-black text-gray-800">0.2s</span>
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-1">Startup Time</span>
                </div>

                {/* Open Source Tile */}
                <div className={`${styles.bentoTile} col-span-1 row-span-2 bg-gray-900! text-white! border-gray-700!`}>
                    <div className="flex flex-col justify-between items-start">
                        <span className="font-mono text-xs text-gray-400">src/main.rs</span>
                        <span className="font-mono text-xs text-gray-400">src/build.rs</span>
                        <span className="font-mono text-xs text-gray-400">components/checkbox.tsx</span>
                        <span className="font-mono text-xs text-gray-400">components/sideBar.tsx</span>
                        <span className="font-mono text-xs text-gray-400">src/api.ts</span>
                        <span className="font-mono text-xs text-gray-400">src/db.ts</span>
                        <span className="font-mono text-xs text-gray-400">src/App.css</span>
                        <span className="font-mono text-xs text-gray-400">+731 -122</span>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold mb-1">Open Source</h3>
                        <p className="text-gray-400 text-xs">Auditable code.<br/>Community driven.</p>
                    </div>
                </div>

                {/* Local First Tile */}
                <div className={`${styles.bentoTile} col-span-1 row-span-1`}>
                    <div className="text-blue-600 mb-2"><Icons.Lock /></div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-xl">Local First</h3>
                        <p className="text-[10px] text-gray-500">Your data lives on your device.</p>
                    </div>
                </div>

                {/* Back Button Tile */}
                <div
                    className={`${styles.bentoTile} col-span-1 row-span-1 items-center justify-center cursor-pointer hover:!bg-gray-100 group`}
                    onClick={() => handleScreenChange(1)}
                >
                    <span className="text-gray-400 group-hover:text-gray-800 font-medium transition-colors">← Go Back</span>
                </div>

                {/* Privacy Tile */}
                <div className={`${styles.bentoTile} hidden md:flex col-span-2 row-span-1 items-center flex-row gap-4 mb-8`}>
                    <div className="text-4xl">🛡️</div>
                    <div>
                        <h3 className="font-bold text-gray-800">Privacy Centric</h3>
                        <p className="text-xs text-gray-500">No trackers. No ads. No selling your life.</p>
                    </div>
                </div>

                {/* Next Action Tile */}
                <div className={`${styles.bentoActionTile} col-span-1 md:col-span-1 row-span-1`} onClick={() => handleScreenChange(3)}>
                    <span className="text-lg font-bold flex items-center gap-2">Next <Icons.ArrowRight /></span>
                </div>

            </div>
        </div>
    );

    // --- Screen 3: Sync & Config ---
    const Screen3 = () => (
        <div className="w-full max-w-2xl flex flex-col items-center animate-in slide-in-from-right-8 duration-500">
            <h1 className={styles.h1}>Sync & Storage</h1>
            <p className="text-gray-500 mb-8 text-center">How do you want to handle your data?</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mb-8">

                {/* Option 1: Cloud */}
                <button
                    className="group relative flex flex-col items-center p-6 bg-white border-2 border-transparent hover:border-blue-500 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 text-center"
                    onClick={() => handleScreenChange(4)}
                >
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-4 group-hover:scale-110 transition-transform"><Icons.Cloud /></div>
                    <h3 className="font-bold text-gray-800 mb-1">Taskly+</h3>
                    <p className="text-xs text-gray-500">Encrypted cloud sync & backup.</p>
                    <span className="absolute top-2 right-2 text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Rec</span>
                </button>

                {/* Option 2: Self-Host */}
                <button
                    className="group flex flex-col items-center p-6 bg-white border-2 border-transparent hover:border-purple-500 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 text-center"
                    onClick={() => console.log("Open Modal")}
                >
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-full mb-4 group-hover:scale-110 transition-transform"><Icons.Server /></div>
                    <h3 className="font-bold text-gray-800 mb-1">Self-Host</h3>
                    <p className="text-xs text-gray-500">Connect your own CouchDB.</p>
                </button>

                {/* Option 3: Local */}
                <button
                    className="group flex flex-col items-center p-6 bg-white border-2 border-transparent hover:border-gray-500 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 text-center"
                    onClick={() => handleScreenChange(4)}
                >
                    <div className="p-3 bg-gray-50 text-gray-600 rounded-full mb-4 group-hover:scale-110 transition-transform"><Icons.Lock /></div>
                    <h3 className="font-bold text-gray-800 mb-1">Local Only</h3>
                    <p className="text-xs text-gray-500">Data never leaves this device.</p>
                </button>
            </div>

            <button className={styles.btnSecondary} onClick={() => handleScreenChange(2)}>
                ← Back to Features
            </button>
        </div>
    );

    // --- Screen 4: Final ---
    const Screen4 = () => (
        <div className="text-center animate-in zoom-in duration-500 flex flex-col items-center">
            <div className="text-6xl mb-6 animate-bounce">🚀</div>
            <h1 className={styles.h1}>You're all set!</h1>
            <p className={styles.p}>
                Taskly is configured and ready. Access your dashboard below.
            </p>

            <button
                className={`${styles.btnPrimary} text-lg px-10 py-4 shadow-blue-500/40`}
                onClick={() => console.log("Navigate to /app")}
            >
                Launch Workspace
            </button>

            <div className="mt-8 pt-8 border-t border-gray-200/50 w-full max-w-xs">
                <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Pro Tip</p>
                <p className="text-sm text-gray-600">Press <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800 font-mono text-xs">Cmd+K</code> at any time to open the command palette.</p>
            </div>
        </div>
    );

    return (
        <div className={styles.mainContainer}>
            <div className={styles.contentCard}>
                {screen === 1 && <Screen1 />}
                {screen === 2 && <Screen2 />}
                {screen === 3 && <Screen3 />}
                {screen === 4 && <Screen4 />}

                <ProgressBar current={screen} />
            </div>
        </div>
    );
}

export default Onboarding;