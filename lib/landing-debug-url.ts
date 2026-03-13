"use client"

export function installLandingUrlDebug() {
  if (typeof window === "undefined") return
  if ((window as any).__landingUrlDebugInstalled) return
  ;(window as any).__landingUrlDebugInstalled = true

  const ts = () => performance.now().toFixed(1)

  window.addEventListener("hashchange", () => {
    console.log("[URL_DEBUG] hashchange", {
      href: window.location.href,
      hash: window.location.hash,
      time: ts(),
    })
    console.trace("[URL_DEBUG] hashchange stack")
  })

  window.addEventListener("popstate", (e) => {
    console.log("[URL_DEBUG] popstate", {
      href: window.location.href,
      hash: window.location.hash,
      state: e.state,
      time: ts(),
    })
    console.trace("[URL_DEBUG] popstate stack")
  })

  const origPush = history.pushState.bind(history)
  history.pushState = function (...args: Parameters<typeof history.pushState>) {
    const [, , url] = args
    console.log("[URL_DEBUG] pushState", {
      url,
      newHref: url ? new URL(String(url), window.location.origin).href : window.location.href,
      time: ts(),
    })
    console.trace("[URL_DEBUG] pushState stack")
    return origPush(...args)
  }

  const origReplace = history.replaceState.bind(history)
  history.replaceState = function (...args: Parameters<typeof history.replaceState>) {
    const [, , url] = args
    console.log("[URL_DEBUG] replaceState", {
      url,
      newHref: url ? new URL(String(url), window.location.origin).href : window.location.href,
      time: ts(),
    })
    console.trace("[URL_DEBUG] replaceState stack")
    return origReplace(...args)
  }

  console.log("[URL_DEBUG] installed", window.location.href)
}
