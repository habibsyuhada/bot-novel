import React, { ReactNode } from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

const Layout = ({ children, title = 'Puppeteer Chrome Runner' }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-base-200">
      <Head>
        <title>{title}</title>
        <meta name="description" content="Run Chrome automation tasks with Puppeteer" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="navbar bg-base-100 shadow-md">
        <div className="navbar-start">
          <div className="dropdown">
            <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" />
              </svg>
            </div>
            <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
              <li><Link href="/">Home</Link></li>
              <li><Link href="/advanced">Advanced</Link></li>
              <li><a href="https://github.com/puppeteer/puppeteer" target="_blank" rel="noopener noreferrer">Puppeteer Docs</a></li>
            </ul>
          </div>
          <Link href="/" className="btn btn-ghost text-xl">Puppeteer Runner</Link>
        </div>
        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1">
            <li><Link href="/">Home</Link></li>
            <li><Link href="/advanced">Advanced</Link></li>
            <li><a href="https://github.com/puppeteer/puppeteer" target="_blank" rel="noopener noreferrer">Puppeteer Docs</a></li>
          </ul>
        </div>
        <div className="navbar-end">
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
              <li><a>Theme</a></li>
              <li><a>Settings</a></li>
            </ul>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="footer footer-center p-4 bg-base-300 text-base-content">
        <div>
          <p>Copyright © {new Date().getFullYear()} - Puppeteer Chrome Runner</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout; 