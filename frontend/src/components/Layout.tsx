import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export function Layout() {
    return (
        <>
            <Navbar />
            <Outlet /> {/* Aquí React Router inyectará mágicamente la página correspondiente */}
            <Footer />
        </>
    );
}